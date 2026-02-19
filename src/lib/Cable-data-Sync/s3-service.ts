import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { createHash } from 'crypto';

export class S3Service {
    private client: S3Client;
    private bucket: string;
    private prefix: string;

    constructor(prefix?: string) {
        this.client = new S3Client({
            region: process.env.AWS_REGION || 'us-west-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
        this.bucket = process.env.S3_BUCKET_NAME!;
        this.prefix = prefix || 'submarine-cable-data';
    }

  
    private calculateHash(data: string): string {
        return createHash('md5').update(data).digest('hex');
    }

    async upload(key: string, data: unknown, contentType = 'application/json'): Promise<void> {
        const fullKey = `${this.prefix}/${key}`;
        const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: fullKey,
                Body: body,
                ContentType: contentType,
                CacheControl: 'public, max-age=3600',
            })
        );
    }

    async uploadIfChanged(key: string, data: unknown, contentType = 'application/json'): Promise<{ uploaded: boolean; isNew: boolean }> {
        const fullKey = `${this.prefix}/${key}`;
        const newDataString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        const newHash = this.calculateHash(newDataString);

     
        let existingETag: string | null = null;
        let fileExists = false;

        try {
            const headResponse = await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: fullKey,
                })
            );
            fileExists = true;
            // ETag comes with quotes, remove them. For single-part uploads, ETag = MD5 hash
            existingETag = headResponse.ETag?.replace(/"/g, '') || null;
        } catch {
            fileExists = false;
        }

    
        if (!fileExists) {
            await this.upload(key, data, contentType);
            return { uploaded: true, isNew: true };
        }

   
        if (existingETag === newHash) {
            return { uploaded: false, isNew: false };
        }

   
        await this.upload(key, data, contentType);
        return { uploaded: true, isNew: false };
    }

    async fileExists(key: string): Promise<boolean> {
        try {
            const fullKey = `${this.prefix}/${key}`;
            await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: fullKey,
                })
            );
            return true;
        } catch {
            return false;
        }
    }

    async getFile(key: string): Promise<unknown> {
        try {
            const fullKey = `${this.prefix}/${key}`;
            const response = await this.client.send(
                new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: fullKey,
                })
            );

            const stream = response.Body as Readable;
            const chunks: Buffer[] = [];

            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            const content = Buffer.concat(chunks).toString('utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    /**
     * Batch upload multiple files in parallel
     * @param uploads Array of {key, data, contentType} objects
     * @param concurrency Maximum number of parallel uploads (default: 20)
     */
    async batchUploadIfChanged(
        uploads: Array<{ key: string; data: unknown; contentType?: string }>,
        concurrency = 20,
        onProgress?: (current: number, total: number) => void
    ): Promise<Array<{ key: string; uploaded: boolean; isNew: boolean }>> {
        const results: Array<{ key: string; uploaded: boolean; isNew: boolean }> = [];
        const queue = [...uploads];
        let processed = 0;
        const total = uploads.length;

        const worker = async () => {
            while (queue.length > 0) {
                const item = queue.shift();
                if (!item) continue;

                try {
                    const result = await this.uploadIfChanged(item.key, item.data, item.contentType);
                    results.push({ key: item.key, ...result });
                    processed++;

                    if (onProgress && processed % 10 === 0) {
                        onProgress(processed, total);
                    }
                } catch (error) {
                    console.error(`Failed to upload ${item.key}:`, error instanceof Error ? error.message : 'Unknown error');
                    results.push({ key: item.key, uploaded: false, isNew: false });
                    processed++;

                    if (onProgress) {
                        onProgress(processed, total);
                    }
                }
            }
        };

        const workers = Array(Math.min(concurrency, uploads.length)).fill(null).map(() => worker());
        await Promise.all(workers);

        if (onProgress) {
            onProgress(total, total);
        }

        return results;
    }
}

