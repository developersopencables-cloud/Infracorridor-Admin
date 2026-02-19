/**
 * Centralized API Endpoints Configuration

 */


const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Helper function to build query string from params object
 */
function buildQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            searchParams.append(key, String(value));
        }
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

/**
 * Master Data API Endpoints
 */
export const masterDataEndpoints = {
    vendor: {
        list: (params?: { search?: string; categoryId?: string }): string => {
            const queryParams: Record<string, string> = {};
            if (params?.search) queryParams.search = params.search;
            if (params?.categoryId) queryParams.categoryId = params.categoryId;
            return `${BASE_API_URL}/api/master-data/vendor${buildQueryString(queryParams)}`;
        },
        getById: (id: string): string => `${BASE_API_URL}/api/master-data/vendor/${id}`,
        create: (): string => `${BASE_API_URL}/api/master-data/vendor`,
        update: (id?: string): string =>
            id
                ? `${BASE_API_URL}/api/master-data/vendor/${id}`
                : `${BASE_API_URL}/api/master-data/vendor`,
        delete: (id: string, useQueryParam: boolean = false): string =>
            useQueryParam
                ? `${BASE_API_URL}/api/master-data/vendor${buildQueryString({ _id: id })}`
                : `${BASE_API_URL}/api/master-data/vendor/${id}`,
    },

    category: {
        list: (params?: { search?: string }): string => {
            const queryParams: Record<string, string> = {};
            if (params?.search) queryParams.search = params.search;
            return `${BASE_API_URL}/api/master-data/category${buildQueryString(queryParams)}`;
        },
        getById: (id: string): string => `${BASE_API_URL}/api/master-data/category/${id}`,
        create: (): string => `${BASE_API_URL}/api/master-data/category`,
        update: (id?: string): string =>
            id
                ? `${BASE_API_URL}/api/master-data/category/${id}`
                : `${BASE_API_URL}/api/master-data/category`,
        delete: (id: string, useQueryParam: boolean = false): string =>
            useQueryParam
                ? `${BASE_API_URL}/api/master-data/category${buildQueryString({ _id: id })}`
                : `${BASE_API_URL}/api/master-data/category/${id}`,
    },
};

/**
 * Corridor Management API Endpoints
 */
export const corridorEndpoints = {
    list: (params?: { search?: string; status?: 'DRAFT' | 'PUBLISHED' | 'ALL' }): string => {
        const queryParams: Record<string, string> = {};
        if (params?.search) queryParams.search = params.search;
        if (params?.status && params.status !== 'ALL') {
            queryParams.status = params.status;
        }
        return `${BASE_API_URL}/api/corridors${buildQueryString(queryParams)}`;
    },

    getById: (id: string): string => `${BASE_API_URL}/api/corridors/${id}`,
    save: (): string => `${BASE_API_URL}/api/corridors`,
    delete: (id: string): string =>
        `${BASE_API_URL}/api/corridors${buildQueryString({ _id: id })}`,
};
export const mapImagesEndpoints = {
    list: (params?: { corridorId?: string; corridorName?: string; folder?: string; page?: number; limit?: number }) => {
        const searchParams = new URLSearchParams();
        searchParams.set("page", String(params?.page ?? 1));
        searchParams.set("limit", String(params?.limit ?? 50));
        if (params?.corridorId) searchParams.set("corridorId", params.corridorId);
        if (params?.corridorName) searchParams.set("corridorName", params.corridorName);
        if (params?.folder) searchParams.set("folder", params.folder);
        const qs = searchParams.toString();
        return `${BASE_API_URL}/api/upload-map-images${qs ? `?${qs}` : ""}`;
    },
    delete: (id: string) => `${BASE_API_URL}/api/upload-map-images/${id}`,
    createMeta: () => `${BASE_API_URL}/api/upload-map-images`,
    getCloudinarySignature: () => `${BASE_API_URL}/api/cloudinary-signature`,
};

export const cableImagesEndpoints = {
    list: (params?: { page?: number; limit?: number; search?: string }) => {
        const searchParams = new URLSearchParams();
        searchParams.set("page", String(params?.page ?? 1));
        searchParams.set("limit", String(params?.limit ?? 50));
        if (params?.search) searchParams.set("search", params.search);
        const qs = searchParams.toString();
        return `${BASE_API_URL}/api/cable-images${qs ? `?${qs}` : ""}`;
    },
    delete: (id: string) => `${BASE_API_URL}/api/cable-images/${id}`,
    create: () => `${BASE_API_URL}/api/cable-images`,
};


/**
 * File upload API Endpoints
 */
export const uploadEndpoints = {

    logo: (): string => `${BASE_API_URL}/api/upload/logo`,

    imageSignature: (): string => `${BASE_API_URL}/api/cloudinary-signature`,
};

/**
 * Sync Cables API Endpoints
 */
export const syncEndpoints = {
    getProgress: (): string => `${BASE_API_URL}/api/sync-cables?progress=true`,
    start: (): string => `${BASE_API_URL}/api/sync-cables`,
    getStatus: (): string => `${BASE_API_URL}/api/sync-cables`,
};

/**
 * Auth API Endpoints
 */
export const authEndpoints = {
    base: (): string => `${BASE_API_URL}/api/auth`,
};

/**
 * Blog Management API Endpoints
 */
export const blogEndpoints = {
    list: (params?: {
        search?: string;
        status?: 'DRAFT' | 'PUBLISHED' | 'ALL';
        type?: 'general' | 'corridor';
        corridorId?: string;
        page?: number;
        limit?: number;
    }): string => {
        const queryParams: Record<string, string | number> = {};
        if (params?.search) queryParams.search = params.search;
        if (params?.status && params.status !== 'ALL') {
            queryParams.status = params.status;
        }
        if (params?.type) queryParams.type = params.type;
        if (params?.corridorId) queryParams.corridorId = params.corridorId;
        if (params?.page) queryParams.page = params.page;
        if (params?.limit) queryParams.limit = params.limit;
        return `${BASE_API_URL}/api/blogs${buildQueryString(queryParams)}`;
    },

    getById: (id: string): string => `${BASE_API_URL}/api/blogs/${id}`,

    getBySlug: (slug: string): string => `${BASE_API_URL}/api/blogs/public/${slug}`,

    create: (): string => `${BASE_API_URL}/api/blogs`,

    update: (id: string): string => `${BASE_API_URL}/api/blogs/${id}`,

    delete: (id: string): string => `${BASE_API_URL}/api/blogs/${id}`,
};

/**
 * Combine all endpoints for convenience
 */
export const apiEndpoints = {
    masterData: masterDataEndpoints,
    corridors: corridorEndpoints,
    blogs: blogEndpoints,
    sync: syncEndpoints,
    auth: authEndpoints,
};
