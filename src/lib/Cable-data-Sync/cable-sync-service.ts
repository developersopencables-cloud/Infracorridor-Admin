import { S3Service } from './s3-service';
import { CableFetchService } from './cable-fetch-service';
import { SyncConfig, SyncResult } from '@/types/cable-sync.types';
import { SyncProgress } from '@/lib/sync-progress-store';

export class CableSyncService {
  private s3: S3Service;
  private fetch: CableFetchService;
  private config: SyncConfig;
  private onProgress?: (progress: SyncProgress) => void;

  constructor(config: SyncConfig, onProgress?: (progress: SyncProgress) => void) {
    this.config = config;
    this.s3 = new S3Service(config.s3.prefix);
    this.fetch = new CableFetchService(config);
    this.onProgress = onProgress;
  }

  private updateProgress(progress: SyncProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  async sync(): Promise<SyncResult & {
    newFiles: string[];
    updatedFiles: string[];
    skippedFiles: string[];
    affectedCableFiles: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    const stats = {
      totalCables: 0,
      fetched: 0,
      failed: 0,
      uploaded: 0,
      skipped: 0,
    };
    const newFiles: string[] = [];
    const updatedFiles: string[] = [];
    const skippedFiles: string[] = [];
    const affectedCableFiles: string[] = [];

    try {
      // Step 1: Fetch landing points and cable geometry data
      this.updateProgress({
        step: 'fetching',
        currentStep: 1,
        totalSteps: 3,
        message: 'Fetching data from submarine cable map...',
      });

      const { geo, land, index } = await this.fetch.fetchBaselineData();
      stats.totalCables = index.length;


      this.updateProgress({
        step: 'comparing',
        currentStep: 2,
        totalSteps: 3,
        message: 'Comparing baseline files with existing data...',
        details: {
          total: 3,
        },
      });

      console.log('☁️ Uploading baseline files to S3...');
      const [geoResult, landResult, indexResult] = await Promise.all([
        this.s3.uploadIfChanged('cablegeo-data.json', geo),
        this.s3.uploadIfChanged('cable-data.json', land),
        this.s3.uploadIfChanged('allcables.json', index),
      ]);


      this.updateProgress({
        step: 'uploading',
        currentStep: 2,
        totalSteps: 3,
        message: 'Baseline files processed, continuing...',
      });

      // Track baseline files
      [geoResult, landResult, indexResult].forEach((result, idx) => {
        const filename = ['cablegeo-data.json', 'cable-data.json', 'allcables.json'][idx];
        if (result.uploaded) {
          if (result.isNew) {
            newFiles.push(filename);
          } else {
            updatedFiles.push(filename);
          }
          stats.uploaded += 1;
        } else {
          skippedFiles.push(filename);
          stats.skipped += 1;
        }
      });

      // Step 3: Fetch individual cable details
      this.updateProgress({
        step: 'fetching',
        currentStep: 1,
        totalSteps: 3,
        message: `Fetching ${index.length} cable details from submarine cable map...`,
        details: {
          total: index.length,
        },
      });

      const cableIds = index.map(c => c.id);
      console.log(` Fetching ${cableIds.length} cable metadata...`);

      const { successful: cableDetails, failed: failedFetches } = await this.fetch.fetchCableDetails(
        cableIds,
        (current, total) => {
          if (current % 50 === 0 || current === total) {
            console.log(`Progress: ${current}/${total} cables fetched`);
            this.updateProgress({
              step: 'fetching',
              currentStep: 1,
              totalSteps: 3,
              message: `Fetching cable details... ${current}/${total}`,
              details: {
                fetched: current,
                total: total,
              },
            });
          }
        }
      );

      stats.fetched = cableDetails.size;
      stats.failed = failedFetches.length;

      // Log and track failed fetches
      if (failedFetches.length > 0) {
        console.log(` Failed to fetch ${failedFetches.length} cables`);
        const failedList = failedFetches.slice(0, 20).join(', ');
        const failedMessage = `Failed to fetch ${failedFetches.length} cables: ${failedList}${failedFetches.length > 20 ? ` (and ${failedFetches.length - 20} more)` : ''}`;
        errors.push(failedMessage);
        console.log(`Failed cable IDs: ${failedFetches.slice(0, 10).join(', ')}${failedFetches.length > 10 ? '...' : ''}`);
      }

      // Step 4: Compare and upload individual cable files (incremental - only if changed) - PARALLEL UPLOADS
      this.updateProgress({
        step: 'comparing',
        currentStep: 2,
        totalSteps: 3,
        message: `Comparing ${cableDetails.size} cable files with existing data...`,
        details: {
          total: cableDetails.size,
        },
      });

      console.log(`☁️ Uploading ${cableDetails.size} cable files to S3 (parallel, concurrency: 20)...`);

      // Prepare upload batch
      const uploadBatch = Array.from(cableDetails.entries()).map(([id, data]) => ({
        key: `metacables/${id}.json`,
        data,
        contentType: 'application/json',
      }));


      const uploadConcurrency = Math.min(20, uploadBatch.length); // Parallel uploads

      this.updateProgress({
        step: 'uploading',
        currentStep: 3,
        totalSteps: 3,
        message: `Uploading ${uploadBatch.length} files to S3...`,
        details: {
          total: uploadBatch.length,
          uploaded: 0,
        },
      });

      const uploadResults = await this.s3.batchUploadIfChanged(
        uploadBatch,
        uploadConcurrency,
        (current, total) => {

          if (current % 10 === 0 || current === total) {
            console.log(`  Upload progress: ${current}/${total} files processed...`);
            this.updateProgress({
              step: 'uploading',
              currentStep: 3,
              totalSteps: 3,
              message: `Uploading to S3... ${current}/${total} files`,
              details: {
                uploaded: current,
                total: total,
              },
            });
          }
        }
      );

      // Process results
      let uploadedCount = 0;
      let skippedCount = 0;

      for (const result of uploadResults) {
        const id = result.key.replace('metacables/', '').replace('.json', '');

        if (result.uploaded) {
          uploadedCount++;
          affectedCableFiles.push(id);
          if (result.isNew) {
            newFiles.push(result.key);
          } else {
            updatedFiles.push(result.key);
          }
        } else {
          skippedCount++;
          skippedFiles.push(result.key);
        }
      }

      console.log(`✅ Upload complete: ${uploadedCount} uploaded, ${skippedCount} skipped`);

      stats.uploaded += uploadedCount;
      stats.skipped = skippedCount;

      // Step 5: Create and upload merged metacables file (only if changed)
      this.updateProgress({
        step: 'uploading',
        currentStep: 3,
        totalSteps: 3,
        message: 'Creating and uploading merged file...',
      });

      console.log(' Creating merged metacables file...');
      const allMetacables = Array.from(cableDetails.values());
      const mergedResult = await this.s3.uploadIfChanged('metacables-all.json', allMetacables);
      if (mergedResult.uploaded) {
        stats.uploaded += 1;
        if (mergedResult.isNew) {
          newFiles.push('metacables-all.json');
        } else {
          updatedFiles.push('metacables-all.json');
        }
      } else {
        stats.skipped += 1;
        skippedFiles.push('metacables-all.json');
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.updateProgress({
        step: 'completed',
        currentStep: 3,
        totalSteps: 3,
        message: 'Sync completed successfully!',
      });

      return {
        success: true,
        stats: {
          ...stats,
          duration: parseFloat(duration),
        },
        errors: errors.length > 0 ? errors : undefined,
        newFiles,
        updatedFiles,
        skippedFiles,
        affectedCableFiles,
      };
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.updateProgress({
        step: 'error',
        currentStep: 0,
        totalSteps: 3,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      return {
        success: false,
        stats: {
          ...stats,
          duration: parseFloat(duration),
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        newFiles,
        updatedFiles,
        skippedFiles,
        affectedCableFiles,
      };
    }
  }
}

