import { NextRequest, NextResponse } from 'next/server';
import { CableSyncService } from '@/lib/Cable-data-Sync/cable-sync-service';
import { SyncConfig } from '@/types/cable-sync.types';
import { syncProgressStore } from '@/lib/sync-progress-store';
import { auth } from '@/database/auth';
import { headers } from 'next/headers';
import connectMongoose from '@/database/mongoose-connection';
import { SyncHistoryModel } from '@/models';
import mongoose from 'mongoose';

const config: SyncConfig = {
    endpoints: {
        geo: 'https://www.submarinecablemap.com/api/v3/cable/cable-geo.json',
        land: 'https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json',
        index: 'https://www.submarinecablemap.com/api/v3/cable/all.json',
        baseCable: 'https://www.submarinecablemap.com/api/v3/cable/',
    },
    s3: {
        bucket: process.env.S3_BUCKET_NAME!,
        prefix: 'submarine-cable-data',
    },
    concurrency: 10,
    maxRetries: 3,
    timeoutMs: 10000,
};


let syncLock = false;
const MAX_HISTORY_ENTRIES = 100; // Keep last 100 sync runs per user

export async function POST() {
    // Check authentication
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    if (syncLock) {
        return NextResponse.json(
            { success: false, error: 'Sync already in progress' },
            { status: 409 }
        );
    }

    syncLock = true;

    try {
        console.log(' Starting cable sync...');

        syncProgressStore.clear();
        const syncId = Date.now().toString();
        syncProgressStore.setProgress({
            step: 'idle',
            currentStep: 0,
            totalSteps: 3,
            message: 'Initializing sync...',
        }, syncId);

        const syncService = new CableSyncService(config, (progress) => {
            syncProgressStore.setProgress(progress, syncId);
        });

        const result = await syncService.sync();

        setTimeout(() => {
            syncProgressStore.clear();
        }, 2000);

        const totalFilesProcessed = (result.newFiles?.length || 0) +
            (result.updatedFiles?.length || 0) +
            (result.skippedFiles?.length || 0);


        await connectMongoose();

        const timestamp = new Date().toISOString();

        const historyEntry = await SyncHistoryModel.create({
            _id: new mongoose.Types.ObjectId(),
            userId: session.user.id,
            timestamp,
            status: result.success ? 'success' : 'failed',
            totalFilesProcessed,
            newFilesAdded: result.newFiles?.length || 0,
            updatedFiles: result.updatedFiles?.length || 0,
            duplicatesSkipped: result.skippedFiles?.length || 0,
            affectedCableFiles: result.affectedCableFiles || [],
            errorDetails: result.errors || [],
            newFiles: result.newFiles || [],
            updatedFilesList: result.updatedFiles || [],
            skippedFiles: result.skippedFiles || [],
            stats: result.stats || {
                totalCables: 0,
                fetched: 0,
                failed: 0,
                uploaded: 0,
                skipped: 0,
                duration: 0,
            },
        });

        // Clean up old entries 
        const userEntries = await SyncHistoryModel.find({ userId: session.user.id })
            .sort({ timestamp: -1 })
            .select('_id')
            .lean();

        if (userEntries.length > MAX_HISTORY_ENTRIES) {
            const idsToDelete = userEntries
                .slice(MAX_HISTORY_ENTRIES)
                .map((entry) => entry._id);

            await SyncHistoryModel.deleteMany({ _id: { $in: idsToDelete } });
        }

        const responseData = {
            ...result,
            success: result.success,
            message: result.success ? 'Sync completed successfully' : 'Sync completed with errors',
            historyId: historyEntry._id,
            historyData: {
                totalFilesProcessed,
                newFilesAdded: result.newFiles?.length || 0,
                updatedFilesCount: result.updatedFiles?.length || 0,
                duplicatesSkipped: result.skippedFiles?.length || 0,
                affectedCableFiles: result.affectedCableFiles || [],
                newFiles: result.newFiles || [],
                updatedFiles: result.updatedFiles || [],
                skippedFiles: result.skippedFiles || [],
            },
        };

        if (result.success) {
            return NextResponse.json(responseData);
        } else {
            return NextResponse.json(responseData, { status: 500 });
        }
    } catch (error) {
        console.error(' Sync error:', error);


        try {
            await connectMongoose();
            await SyncHistoryModel.create({
                _id: new mongoose.Types.ObjectId(),
                userId: session?.user?.id || 'unknown',
                timestamp: new Date().toISOString(),
                status: 'failed',
                totalFilesProcessed: 0,
                newFilesAdded: 0,
                updatedFiles: 0,
                duplicatesSkipped: 0,
                affectedCableFiles: [],
                errorDetails: [error instanceof Error ? error.message : 'Unknown error'],
                newFiles: [],
                updatedFilesList: [],
                skippedFiles: [],
                stats: {
                    totalCables: 0,
                    fetched: 0,
                    failed: 0,
                    uploaded: 0,
                    skipped: 0,
                    duration: 0,
                },
            });
        } catch (historyError) {
            console.error('Failed to save error to sync history:', historyError);
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                historyData: {
                    totalFilesProcessed: 0,
                    newFilesAdded: 0,
                    updatedFilesCount: 0,
                    duplicatesSkipped: 0,
                    affectedCableFiles: [],
                    newFiles: [],
                    updatedFiles: [],
                    skippedFiles: [],
                },
            },
            { status: 500 }
        );
    } finally {
        syncLock = false;
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);


        if (searchParams.get('stream') === 'true') {
            const encoder = new TextEncoder();

            const stream = new ReadableStream({
                async start(controller) {

                    controller.enqueue(encoder.encode(': connected\n\n'));

                    let lastProgress: string | null = null;
                    let consecutiveErrors = 0;
                    const maxErrors = 10;

                    const sendProgress = () => {
                        if (request.signal.aborted) {
                            clearInterval(interval);
                            return;
                        }

                        try {
                            const progress = syncProgressStore.getProgress();
                            const progressJson = JSON.stringify({
                                success: true,
                                progress: progress || {
                                    step: 'idle',
                                    currentStep: 0,
                                    totalSteps: 3,
                                    message: 'No sync in progress',
                                },
                            });


                            if (progressJson !== lastProgress) {
                                controller.enqueue(encoder.encode(`data: ${progressJson}\n\n`));
                                lastProgress = progressJson;
                                consecutiveErrors = 0;
                            }


                            if (progress && (progress.step === 'completed' || progress.step === 'error')) {
                                clearInterval(interval);
                                setTimeout(() => {
                                    try {
                                        if (!request.signal.aborted) {
                                            controller.close();
                                        }
                                    } catch (e) {
                                        // Ignore close errors
                                    }
                                }, 1000);
                                return;
                            }
                        } catch (err) {
                            if (request.signal.aborted) {
                                clearInterval(interval);
                                return;
                            }

                            consecutiveErrors++;
                            if (consecutiveErrors >= maxErrors) {
                                try {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                        success: false,
                                        error: 'Too many errors, closing connection',
                                    })}\n\n`));
                                    controller.close();
                                } catch (e) {
                                    // Ignore errors during error reporting/closing
                                }
                                clearInterval(interval);
                                return;
                            }
                        }
                    };

                    const interval = setInterval(sendProgress, 1000);


                    sendProgress();

                    request.signal.addEventListener('abort', () => {
                        clearInterval(interval);
                        try {
                            controller.close();
                        } catch (e) {
                            // Ignore close errors
                        }
                    });
                },
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                },
            });
        }


        if (searchParams.get('progress') === 'true') {
            const progress = syncProgressStore.getProgress();
            return NextResponse.json({
                success: true,
                progress: progress || {
                    step: 'idle',
                    currentStep: 0,
                    totalSteps: 3,
                    message: 'No sync in progress',
                },
            });
        }

        // Regular status check
        const { S3Service } = await import('@/lib/Cable-data-Sync/s3-service');
        const s3 = new S3Service(config.s3.prefix);

        const hasFiles = await s3.fileExists('metacables-all.json');

        return NextResponse.json({
            success: true,
            hasData: hasFiles,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

