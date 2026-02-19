/**
 * In-memory store for tracking sync progress
 * This allows the frontend to poll for progress updates
 */

export type SyncStep =
    | 'idle'
    | 'fetching'
    | 'comparing'
    | 'uploading'
    | 'completed'
    | 'error';

export interface SyncProgress {
    step: SyncStep;
    currentStep: number;
    totalSteps: number;
    message: string;
    details?: {
        fetched?: number;
        total?: number;
        uploaded?: number;
        compared?: number;
    };
}

class SyncProgressStore {
    private progress: SyncProgress | null = null;
    private syncId: string | null = null;

    setProgress(progress: SyncProgress, id?: string) {
        this.progress = progress;
        if (id) {
            this.syncId = id;
        }
    }

    getProgress(): SyncProgress | null {
        return this.progress;
    }

    clear() {
        this.progress = null;
        this.syncId = null;
    }

    getSyncId(): string | null {
        return this.syncId;
    }
}

// Singleton instance
export const syncProgressStore = new SyncProgressStore();

