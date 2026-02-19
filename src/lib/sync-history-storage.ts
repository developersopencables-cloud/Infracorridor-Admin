import { SyncHistoryEntry } from '@/types/cable-sync.types';


export class SyncHistoryStorage {
    /**
     * Get all sync history entries for the current user
     */
    static async getAll(): Promise<SyncHistoryEntry[]> {
        try {
            const response = await fetch('/api/sync-history');
            if (!response.ok) {
                console.error('Error fetching sync history:', response.statusText);
                return [];
            }
            const data = await response.json();
            return data.success ? (data.data || []) : [];
        } catch (error) {
            console.error('Error reading sync history:', error);
            return [];
        }
    }

  
    static async add(entry: Omit<SyncHistoryEntry, 'id' | 'timestamp'>): Promise<SyncHistoryEntry> {
        try {
            const response = await fetch('/api/sync-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(entry),
            });
            if (!response.ok) {
                throw new Error('Failed to save sync history');
            }
            const data = await response.json();
            return data.success ? data.data : entry as SyncHistoryEntry;
        } catch (error) {
            console.error('Error saving sync history:', error);
            // Return entry with generated ID for fallback
            return {
                ...entry,
                id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
            } as SyncHistoryEntry;
        }
    }

    /**
     * Get sync history entry by ID
     */
    static async getById(id: string): Promise<SyncHistoryEntry | null> {
        try {
            const response = await fetch(`/api/sync-history/${id}`);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error fetching sync history entry:', error);
            return null;
        }
    }

    /**
     * Get the latest sync history entry for the current user
     */
    static async getLatest(): Promise<SyncHistoryEntry | null> {
        try {
            const response = await fetch('/api/sync-history?latest=true');
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error fetching latest sync history:', error);
            return null;
        }
    }

    /**
     * Clear sync history (admin only)
     */
    static async clear(): Promise<boolean> {
        try {
            const response = await fetch('/api/sync-history', {
                method: 'DELETE',
            });
            return response.ok;
        } catch (error) {
            console.error('Error clearing sync history:', error);
            return false;
        }
    }
}
