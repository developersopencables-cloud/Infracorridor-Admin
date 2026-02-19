import { SyncConfig, Cable, CableGeo } from '@/types/cable-sync.types';

export class CableFetchService {
    private config: SyncConfig;

    constructor(config: SyncConfig) {
        this.config = config;
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchWithRetry<T>(url: string, maxRetries = this.config.maxRetries): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries) {
                    const delay = 800 * attempt;
                    console.log(`Retry ${attempt}/${maxRetries} for ${url} after ${delay}ms`);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError || new Error('Unknown error');
    }

    async fetchBaselineData(): Promise<{
        geo: CableGeo;
        land: unknown;
        index: Cable[];
    }> {
        console.log(' Fetching landing points and cable geometry data...');

        const [geo, land, index] = await Promise.all([
            this.fetchWithRetry<CableGeo>(this.config.endpoints.geo),
            this.fetchWithRetry<unknown>(this.config.endpoints.land),
            this.fetchWithRetry<Cable[]>(this.config.endpoints.index),
        ]);

        return { geo, land, index };
    }

    async fetchCableDetails(
        cableIds: string[],
        onProgress?: (current: number, total: number) => void
    ): Promise<{
        successful: Map<string, Cable>;
        failed: string[];
    }> {
        const results = new Map<string, Cable>();
        const failed: string[] = [];
        const queue = [...cableIds];
        let processed = 0;

        const worker = async () => {
            while (queue.length > 0) {
                const id = queue.shift();
                if (!id) continue;

                try {
                    const url = `${this.config.endpoints.baseCable}${id}.json`;
                    const data = await this.fetchWithRetry<Cable>(url);
                    results.set(id, data);
                    processed++;

                    if (onProgress) {
                        onProgress(processed, cableIds.length);
                    }
                } catch (error) {
                    console.error(` Failed to fetch ${id}:`, error instanceof Error ? error.message : 'Unknown error');
                    failed.push(id);
                    processed++;
                    if (onProgress) {
                        onProgress(processed, cableIds.length);
                    }
                }
            }
        };

        const workers = Array(this.config.concurrency).fill(null).map(() => worker());
        await Promise.all(workers);

        return { successful: results, failed };
    }
}

