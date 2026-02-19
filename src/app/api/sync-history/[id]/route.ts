import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/database/auth';
import { headers } from 'next/headers';
import connectMongoose from '@/database/mongoose-connection';
import { SyncHistoryModel } from '@/models';
import { SyncHistoryEntry } from '@/types/cable-sync.types';
import { checkAdminSession } from '@/database/auth-utils';

interface Params {
    params: Promise<{
        id: string;
    }>;
}


export async function GET(_request: NextRequest, { params }: Params) {
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

        const { id } = await params;
        const entry = await SyncHistoryModel.findById(id).lean();

        if (!entry) {
            return NextResponse.json(
                { success: false, error: 'Sync history entry not found' },
                { status: 404 }
            );
        }

       
        if (entry.userId !== session.user.id) {
            const adminCheck = await checkAdminSession(headersList);
            if (!adminCheck || !adminCheck.isAdmin) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized. You can only view your own sync history.' },
                    { status: 403 }
                );
            }
        }

        const historyEntry: SyncHistoryEntry = {
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
        };

        return NextResponse.json({
            success: true,
            data: historyEntry,
        });
    } catch (error) {
        console.error('Error fetching sync history entry:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch sync history entry',
            },
            { status: 500 }
        );
    }
}

