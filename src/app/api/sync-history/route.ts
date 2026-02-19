import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/database/auth';
import { headers } from 'next/headers';
import connectMongoose from '@/database/mongoose-connection';
import { SyncHistoryModel } from '@/models';
import { SyncHistoryEntry } from '@/types/cable-sync.types';
import { checkAdminSession } from '@/database/auth-utils';
import mongoose from 'mongoose';

const MAX_HISTORY_ENTRIES = 100; // Keep last 100 sync runs per user

export async function GET(request: NextRequest) {
    try {
        const headersList = await headers();
        const session = await auth.api.getSession({ headers: headersList });

        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectMongoose();

        const { searchParams } = new URL(request.url);
        const latest = searchParams.get('latest') === 'true';
        const userIdParam = searchParams.get('userId');


        let targetUserId = session.user.id;
        if (userIdParam && userIdParam !== session.user.id) {
            const adminCheck = await checkAdminSession(headersList);
            if (!adminCheck || !adminCheck.isAdmin) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized. Admin access required to view other users\' history.' },
                    { status: 403 }
                );
            }
            targetUserId = userIdParam;
        }

        if (latest) {
            const latestEntry = await SyncHistoryModel.findOne({ userId: targetUserId })
                .sort({ timestamp: -1 })
                .lean();

            if (!latestEntry) {
                return NextResponse.json({
                    success: true,
                    data: null,
                });
            }


            const entry: SyncHistoryEntry = {
                id: latestEntry._id,
                timestamp: latestEntry.timestamp,
                status: latestEntry.status as 'success' | 'failed',
                totalFilesProcessed: latestEntry.totalFilesProcessed,
                newFilesAdded: latestEntry.newFilesAdded,
                updatedFiles: latestEntry.updatedFiles,
                duplicatesSkipped: latestEntry.duplicatesSkipped,
                affectedCableFiles: latestEntry.affectedCableFiles,
                errorDetails: latestEntry.errorDetails,
                newFiles: latestEntry.newFiles,
                updatedFilesList: latestEntry.updatedFilesList,
                skippedFiles: latestEntry.skippedFiles,
                stats: latestEntry.stats,
            };

            return NextResponse.json({
                success: true,
                data: entry,
            });
        }

        const entries = await SyncHistoryModel.find({ userId: targetUserId })
            .sort({ timestamp: -1 })
            .limit(MAX_HISTORY_ENTRIES)
            .lean();

        const historyEntries: SyncHistoryEntry[] = entries.map((entry) => ({
            id: entry._id,
            timestamp: entry.timestamp,
            status: entry.status as 'success' | 'failed',
            totalFilesProcessed: entry.totalFilesProcessed,
            newFilesAdded: entry.newFilesAdded,
            updatedFiles: entry.updatedFiles,
            duplicatesSkipped: entry.duplicatesSkipped,
            affectedCableFiles: entry.affectedCableFiles,
            errorDetails: entry.errorDetails,
            newFiles: entry.newFiles,
            updatedFilesList: entry.updatedFilesList,
            skippedFiles: entry.skippedFiles,
            stats: entry.stats,
        }));

        return NextResponse.json({
            success: true,
            data: historyEntries,
            count: historyEntries.length,
        });
    } catch (error) {
        console.error('Error fetching sync history:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch sync history',
            },
            { status: 500 }
        );
    }
}


export async function POST(request: NextRequest) {
    try {
        const headersList = await headers();
        const session = await auth.api.getSession({ headers: headersList });

        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectMongoose();

        const body = await request.json();
        const {
            status,
            totalFilesProcessed,
            newFilesAdded,
            updatedFiles,
            duplicatesSkipped,
            affectedCableFiles,
            errorDetails,
            newFiles,
            updatedFilesList,
            skippedFiles,
            stats,
        } = body;

        const timestamp = new Date().toISOString();

        const newEntry = await SyncHistoryModel.create({
            _id: new mongoose.Types.ObjectId(),
            userId: session.user.id,
            timestamp,
            status: status || 'success',
            totalFilesProcessed: totalFilesProcessed || 0,
            newFilesAdded: newFilesAdded || 0,
            updatedFiles: updatedFiles || 0,
            duplicatesSkipped: duplicatesSkipped || 0,
            affectedCableFiles: affectedCableFiles || [],
            errorDetails: errorDetails || [],
            newFiles: newFiles || [],
            updatedFilesList: updatedFilesList || [],
            skippedFiles: skippedFiles || [],
            stats: stats || {
                totalCables: 0,
                fetched: 0,
                failed: 0,
                uploaded: 0,
                skipped: 0,
                duration: 0,
            },
        });

        //clean up old entries
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

        const entry: SyncHistoryEntry = {
            id: newEntry._id,
            timestamp: newEntry.timestamp,
            status: newEntry.status as 'success' | 'failed',
            totalFilesProcessed: newEntry.totalFilesProcessed,
            newFilesAdded: newEntry.newFilesAdded,
            updatedFiles: newEntry.updatedFiles,
            duplicatesSkipped: newEntry.duplicatesSkipped,
            affectedCableFiles: newEntry.affectedCableFiles,
            errorDetails: newEntry.errorDetails,
            newFiles: newEntry.newFiles,
            updatedFilesList: newEntry.updatedFilesList,
            skippedFiles: newEntry.skippedFiles,
            stats: newEntry.stats,
        };

        return NextResponse.json({
            success: true,
            data: entry,
        });
    } catch (error) {
        console.error('Error creating sync history:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create sync history',
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const headersList = await headers();
        const session = await auth.api.getSession({ headers: headersList });

        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectMongoose();

        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');

        let targetUserId = session.user.id;


        if (userIdParam && userIdParam !== session.user.id) {
            const adminCheck = await checkAdminSession(headersList);
            if (!adminCheck || !adminCheck.isAdmin) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized. Admin access required.' },
                    { status: 403 }
                );
            }
            targetUserId = userIdParam;
        }

        await SyncHistoryModel.deleteMany({ userId: targetUserId });

        return NextResponse.json({
            success: true,
            message: 'Sync history cleared successfully',
        });
    } catch (error) {
        console.error('Error clearing sync history:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear sync history',
            },
            { status: 500 }
        );
    }
}

