export interface Cable {
    id: string;
    name: string;
    length?: string;
    landing_points: LandingPoint[];
    owners?: string;
    suppliers?: string;
    rfs?: string;
    rfs_year?: number;
    is_planned?: boolean;
    url?: string;
    notes?: string;
}

export interface LandingPoint {
    id: string;
    name: string;
    country: string;
    is_tbd?: boolean | null;
}

export interface CableGeo {
    type: string;
    features: GeoFeature[];
}

export interface GeoFeature {
    type: string;
    properties: {
        id: string;
        [key: string]: unknown;
    };
    geometry: {
        type: string;
        coordinates: number[][];
    };
}

export interface SyncConfig {
    endpoints: {
        geo: string;
        land: string;
        index: string;
        baseCable: string;
    };
    s3: {
        bucket: string;
        prefix: string;
    };
    concurrency: number;
    maxRetries: number;
    timeoutMs: number;
}

export interface SyncResult {
    success: boolean;
    stats: {
        totalCables: number;
        fetched: number;
        failed: number;
        uploaded: number;
        skipped: number;
        duration: number;
    };
    errors?: string[];
}

export interface SyncHistoryEntry {
    id: string;
    timestamp: string;
    status: 'success' | 'failed';
    totalFilesProcessed: number;
    newFilesAdded: number;
    updatedFiles: number;
    duplicatesSkipped: number;
    affectedCableFiles: string[];
    errorDetails?: string[];
    newFiles?: string[];
    updatedFilesList?: string[];
    skippedFiles?: string[];
    stats: {
        totalCables: number;
        fetched: number;
        failed: number;
        uploaded: number;
        skipped: number;
        duration: number;
    };
}

