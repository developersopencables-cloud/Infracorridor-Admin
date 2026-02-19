/**
 * Centralized API service layer
 */

import { handleFetchError } from "@/utils/error-handler";

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    [key: string]: unknown;
}

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T = unknown>(
    url: string,
    options?: RequestInit
): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const errorMessage = await handleFetchError(response);
            return {
                success: false,
                error: errorMessage,
            };
        }

        const data = await response.json();
        return data as ApiResponse<T>;
    } catch (error) {
        console.error("API call failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}

/**
 * User Management API Service
 */
export const userService = {
    /**
     * Fetch users with filters
     */
    async getUsers(params: {
        role?: string;
        adminOnly?: boolean;
        search?: string;
    }): Promise<ApiResponse<{ data: unknown[]; stats?: unknown }>> {
        const searchParams = new URLSearchParams();

        if (params.adminOnly) {
            searchParams.append("adminOnly", "true");
        } else if (params.role && params.role !== "all") {
            searchParams.append("role", params.role);
        }

        if (params.search) {
            searchParams.append("search", params.search);
        }

        return apiFetch(`/api/user-management?${searchParams.toString()}`);
    },

    /**
     * Update user
     */
    async updateUser(data: {
        userId: string;
        name?: string;
        role?: string;
        emailVerified?: boolean;
    }): Promise<ApiResponse<unknown>> {
        return apiFetch("/api/user-management", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete user
     */
    async deleteUser(userId: string): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/user-management?userId=${userId}`, {
            method: "DELETE",
        });
    },
};

/**
 * Category API Service
 */
export const categoryService = {
    /**
     * Get all categories
     */
    async getAll(params?: { search?: string; classificationId?: string }): Promise<ApiResponse<unknown[]>> {
        const searchParams = new URLSearchParams();
        if (params?.search) {
            searchParams.append("search", params.search);
        }
        if (params?.classificationId) {
            searchParams.append("classificationId", params.classificationId);
        }
        const query = searchParams.toString();
        return apiFetch(`/api/master-data/category${query ? `?${query}` : ""}`);
    },

    /**
     * Get category by ID
     */
    async getById(id: string): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/master-data/category/${id}`);
    },

    /**
     * Get category impact (vendors affected)
     */
    async getImpact(id: string): Promise<ApiResponse<any>> {
        return apiFetch(`/api/master-data/category/${id}?impact=true`);
    },

    /**
     * Create category
     */
    async create(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch("/api/master-data/category", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    /**
     * Update category
     */
    async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/master-data/category/${id}`, {
            method: "PUT",
            body: JSON.stringify({ ...data, _id: id }),
        });
    },

    /**
     * Delete category
     */
    async delete(id: string): Promise<ApiResponse<void>> {
        return apiFetch(`/api/master-data/category/${id}`, {
            method: "DELETE",
        });
    },
};

/**
 * Category Classification API Service
 */
export const categoryClassificationService = {
    /**
     * Get all classifications
     */
    async getAll(params?: { search?: string }): Promise<ApiResponse<unknown[]>> {
        const searchParams = new URLSearchParams();
        if (params?.search) {
            searchParams.append("search", params.search);
        }
        const query = searchParams.toString();
        return apiFetch(`/api/master-data/category-classification${query ? `?${query}` : ""}`);
    },

    /**
     * Get classification by ID
     */
    async getById(id: string): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/master-data/category-classification/${id}`);
    },

    /**
     * Create classification
     */
    async create(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch("/api/master-data/category-classification", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    /**
     * Update classification
     */
    async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/master-data/category-classification/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete classification
     */
    async delete(id: string): Promise<ApiResponse<void>> {
        return apiFetch(`/api/master-data/category-classification/${id}`, {
            method: "DELETE",
        });
    },

    /**
     * Get affected categories for a classification
     */
    async getAffectedCategories(id: string): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/master-data/category-classification/${id}/affected-categories`);
    },
};

/**
 * Vendor API Service
 */
export const vendorService = {
    /**
     * Get all vendors
     */
    async getAll(params?: { search?: string; categoryId?: string }): Promise<ApiResponse<unknown[]>> {
        const searchParams = new URLSearchParams();
        if (params?.search) {
            searchParams.append("search", params.search);
        }
        if (params?.categoryId) {
            searchParams.append("categoryId", params.categoryId);
        }
        const query = searchParams.toString();
        return apiFetch(`/api/master-data/vendor${query ? `?${query}` : ""}`);
    },

    /**
     * Get vendor by ID
     */
    async getById(id: string): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/master-data/vendor/${id}`);
    },

    /**
     * Get vendor impact (corridors affected)
     */
    async getImpact(id: string): Promise<ApiResponse<any>> {
        return apiFetch(`/api/master-data/vendor/${id}?impact=true`);
    },

    /**
     * Create vendor
     */
    async create(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch("/api/master-data/vendor", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    /**
     * Update vendor
     */
    async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/master-data/vendor/${id}`, {
            method: "PUT",
            body: JSON.stringify({ ...data, _id: id }),
        });
    },

    /**
     * Delete vendor
     */
    async delete(id: string): Promise<ApiResponse<void>> {
        return apiFetch(`/api/master-data/vendor/${id}`, {
            method: "DELETE",
        });
    },
};

/**
 * Cloudinary Upload Service
 */
export const uploadService = {
    /**
     * Get Cloudinary signature for upload
     */
    async getSignature(type: string): Promise<ApiResponse<{
        cloudName: string;
        apiKey: string;
        timestamp: number;
        signature: string;
        folder: string;
        publicId: string;
    }>> {
        return apiFetch("/api/cloudinary-signature", {
            method: "POST",
            body: JSON.stringify({ type }),
        });
    },

    /**
     * Upload file to Cloudinary
     */
    async uploadToCloudinary(
        file: File,
        signatureData: {
            cloudName: string;
            apiKey: string;
            timestamp: number;
            signature: string;
            folder: string;
            publicId: string;
        }
    ): Promise<{ secure_url: string }> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signatureData.apiKey);
        formData.append("timestamp", String(signatureData.timestamp));
        formData.append("signature", signatureData.signature);
        formData.append("folder", signatureData.folder);
        formData.append("public_id", signatureData.publicId);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            let errorMessage = error.error?.message || "Cloudinary upload failed";

            if (errorMessage.includes("File size too large") || errorMessage.includes("Maximum is")) {
                errorMessage = "The file is too large. Please upload an image smaller than 10MB.";
            }

            throw new Error(errorMessage);
        }

        return response.json();
    },
};

/**
 * Corridor API Service
 */
export const corridorService = {
    /**
     * Get all corridors
     */
    async getAll(params?: {
        type?: string;
        search?: string;
        status?: "DRAFT" | "PUBLISHED" | "ALL"
    }): Promise<ApiResponse<unknown[]>> {
        const searchParams = new URLSearchParams();
        if (params?.type) {
            searchParams.append("type", params.type);
        }
        if (params?.search) {
            searchParams.append("search", params.search);
        }
        if (params?.status && params.status !== "ALL") {
            searchParams.append("status", params.status);
        }
        const query = searchParams.toString();
        return apiFetch(`/api/corridors${query ? `?${query}` : ""}`);
    },

    /**
     * Get corridor by ID
     */
    async getById(id: string): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/corridors/${id}`);
    },

    /**
     * Create corridor
     */
    async create(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch("/api/corridors", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    /**
     * Update corridor
     */
    async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/corridors/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete corridor
     */
    async delete(id: string): Promise<ApiResponse<void>> {
        return apiFetch(`/api/corridors?_id=${id}`, {
            method: "DELETE",
        });
    },
};

/**
 * Map Images API Service
 */
export const mapImageService = {
    /**
     * Get all map images
     */
    async getAll(params?: { page?: number; limit?: number }): Promise<ApiResponse<{
        data: unknown[];
        pagination: unknown;
    }>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append("page", String(params.page));
        if (params?.limit) searchParams.append("limit", String(params.limit));
        const query = searchParams.toString();
        return apiFetch(`/api/upload-map-images${query ? `?${query}` : ""}`);
    },

    /**
     * Delete map image
     */
    async delete(id: string): Promise<ApiResponse<void>> {
        return apiFetch(`/api/upload-map-images/${id}`, {
            method: "DELETE",
        });
    },
};

/**
 * Cable Image Reference API Service
 */
export const cableImageService = {
    /**
     * Get all cable images
     */
    async getAll(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<{
        data: unknown[];
        pagination: unknown;
    }>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append("page", String(params.page));
        if (params?.limit) searchParams.append("limit", String(params.limit));
        if (params?.search) searchParams.append("search", params.search);
        const query = searchParams.toString();
        return apiFetch(`/api/cable-images${query ? `?${query}` : ""}`);
    },

    /**
     * Create cable image
     */
    async create(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch("/api/cable-images", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    /**
     * Update cable image
     */
    async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/cable-images/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete cable image
     */
    async delete(id: string): Promise<ApiResponse<void>> {
        return apiFetch(`/api/cable-images/${id}`, {
            method: "DELETE",
        });
    },
};

/**
 * Cable List API Service (S3)
 */
export const cableListService = {
    /**
     * Get all cables from S3
     */
    async getAll(): Promise<ApiResponse<any[]>> {
        return apiFetch("/api/cable-list");
    },
};

/**
 * Blog API Service
 */
export const blogService = {
    /**
     * Get all blogs with optional filters
     */
    async getAll(params?: {
        search?: string;
        status?: 'DRAFT' | 'PUBLISHED' | 'ALL';
        type?: 'general' | 'corridor';
        corridorId?: string;
        page?: number;
        limit?: number;
    }): Promise<ApiResponse<unknown[]>> {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append("search", params.search);
        if (params?.status && params.status !== "ALL") {
            searchParams.append("status", params.status);
        }
        if (params?.type) searchParams.append("type", params.type);
        if (params?.corridorId) searchParams.append("corridorId", params.corridorId);
        if (params?.page) searchParams.append("page", String(params.page));
        if (params?.limit) searchParams.append("limit", String(params.limit));
        const query = searchParams.toString();
        return apiFetch(`/api/blogs${query ? `?${query}` : ""}`);
    },

    /**
     * Get blog by ID
     */
    async getById(id: string): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/blogs/${id}`);
    },

    /**
     * Get published blog by slug (public)
     */
    async getBySlug(slug: string): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/blogs/public/${slug}`);
    },

    /**
     * Create blog
     */
    async create(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch("/api/blogs", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    /**
     * Update blog
     */
    async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/blogs/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete blog
     */
    async delete(id: string): Promise<ApiResponse<void>> {
        return apiFetch(`/api/blogs/${id}`, {
            method: "DELETE",
        });
    },
};
