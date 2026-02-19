/**
 * TanStack Query hooks for API calls
 * 
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  userService,
  categoryService,
  vendorService,
  corridorService,
  mapImageService,
  uploadService,
  categoryClassificationService,
  cableImageService,
  cableListService,
  blogService,
} from "@/services/api.service";
import { showSuccess, showError } from "@/utils/toast";

/**
 * Query key factories
 */
export const queryKeys = {
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (filters?: { role?: string; adminOnly?: boolean; search?: string }) =>
      [...queryKeys.users.lists(), filters] as const,
  },
  categories: {
    all: ["categories"] as const,
    lists: () => [...queryKeys.categories.all, "list"] as const,
    list: (filters?: { search?: string; classificationId?: string }) => [...queryKeys.categories.lists(), filters] as const,
    details: () => [...queryKeys.categories.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.categories.details(), id] as const,
  },
  categoryClassifications: {
    all: ["category-classifications"] as const,
    lists: () => [...queryKeys.categoryClassifications.all, "list"] as const,
    list: (filters?: { search?: string }) => [...queryKeys.categoryClassifications.lists(), filters] as const,
    details: () => [...queryKeys.categoryClassifications.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.categoryClassifications.details(), id] as const,
  },
  vendors: {
    all: ["vendors"] as const,
    lists: () => [...queryKeys.vendors.all, "list"] as const,
    list: (filters?: { search?: string; categoryId?: string }) => [...queryKeys.vendors.lists(), filters] as const,
    details: () => [...queryKeys.vendors.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.vendors.details(), id] as const,
  },
  corridors: {
    all: ["corridors"] as const,
    lists: () => [...queryKeys.corridors.all, "list"] as const,
    list: (filters?: {
      type?: string;
      search?: string;
      status?: "DRAFT" | "PUBLISHED" | "ALL"
    }) => [...queryKeys.corridors.lists(), filters] as const,
    details: () => [...queryKeys.corridors.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.corridors.details(), id] as const,
  },
  mapImages: {
    all: ["map-images"] as const,
    lists: () => [...queryKeys.mapImages.all, "list"] as const,
    list: (params?: { page?: number; limit?: number }) =>
      [...queryKeys.mapImages.lists(), params] as const,
  },
  cableImages: {
    all: ["cable-images"] as const,
    lists: () => [...queryKeys.cableImages.all, "list"] as const,
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      [...queryKeys.cableImages.lists(), params] as const,
  },
  cableList: {
    all: ["cable-list"] as const,
  },
  blogs: {
    all: ["blogs"] as const,
    lists: () => [...queryKeys.blogs.all, "list"] as const,
    list: (filters?: {
      search?: string;
      status?: "DRAFT" | "PUBLISHED" | "ALL";
      type?: "general" | "corridor";
      corridorId?: string;
      page?: number;
      limit?: number;
    }) => [...queryKeys.blogs.lists(), filters] as const,
    details: () => [...queryKeys.blogs.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.blogs.details(), id] as const,
    bySlug: (slug: string) => [...queryKeys.blogs.all, "slug", slug] as const,
  },
};

/**
 * User hooks
 */
export function useUsers(filters?: { role?: string; adminOnly?: boolean; search?: string }) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => {
      const response = await userService.getUsers(filters || {});
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch users");
      }
      return response;
    },
    enabled: true,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      name?: string;
      role?: string;
      emailVerified?: boolean;
    }) => {
      const response = await userService.updateUser(data);
      if (!response.success) {
        throw new Error(response.error || "Failed to update user");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      showSuccess("User updated successfully");
    },
    onError: (error: Error) => {
      showError("Failed to update user", error.message);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await userService.deleteUser(userId);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete user");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      showSuccess("User deleted successfully");
    },
    onError: (error: Error) => {
      showError("Failed to delete user", error.message);
    },
  });
}

/**
 * Category hooks
 */
export function useCategories(filters?: { search?: string; classificationId?: string }) {
  return useQuery({
    queryKey: queryKeys.categories.list(filters),
    queryFn: async () => {
      const response = await categoryService.getAll(filters);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch categories");
      }
      return response.data || [];
    },
  });
}

export function useCategory(id: string | null) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const response = await categoryService.getById(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch category");
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCategoryImpact(id: string | null) {
  return useQuery({
    queryKey: [...queryKeys.categories.detail(id!), "impact"],
    queryFn: async () => {
      if (!id) return null;
      const response = await categoryService.getImpact(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch category impact");
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await categoryService.create(data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create category");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
      showSuccess("Category created successfully");
    },
    onError: (error: Error) => {
      showError("Failed to create category", error.message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await categoryService.update(id, data);
      if (!response.success) {
        throw new Error(response.error || "Failed to update category");
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.detail(variables.id) });
      showSuccess("Category updated successfully");
    },
    onError: (error: Error) => {
      showError("Failed to update category", error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await categoryService.delete(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete category");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
      showSuccess("Category deleted successfully");
    },
    onError: (error: Error) => {
      showError("Failed to delete category", error.message);
    },
  });
}

/**
 * Category Classification hooks
 */
export function useCategoryClassifications(filters?: { search?: string }) {
  return useQuery({
    queryKey: queryKeys.categoryClassifications.list(filters),
    queryFn: async () => {
      const response = await categoryClassificationService.getAll(filters);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch classifications");
      }
      return response.data || [];
    },
  });
}

export function useCategoryClassification(id: string | null) {
  return useQuery({
    queryKey: queryKeys.categoryClassifications.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const response = await categoryClassificationService.getById(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch classification");
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateCategoryClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await categoryClassificationService.create(data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create classification");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryClassifications.lists() });
      showSuccess("Classification created successfully");
    },
    onError: (error: Error) => {
      showError("Failed to create classification", error.message);
    },
  });
}

export function useUpdateCategoryClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await categoryClassificationService.update(id, data);
      if (!response.success) {
        throw new Error(response.error || "Failed to update classification");
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryClassifications.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryClassifications.detail(variables.id) });
      showSuccess("Classification updated successfully");
    },
    onError: (error: Error) => {
      showError("Failed to update classification", error.message);
    },
  });
}

export function useDeleteCategoryClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await categoryClassificationService.delete(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete classification");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryClassifications.lists() });
      showSuccess("Classification deleted successfully");
    },
    onError: (error: Error) => {
      showError("Failed to delete classification", error.message);
    },
  });
}

export function useAffectedCategories(id: string | null) {
  return useQuery({
    queryKey: ['affected-categories', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await categoryClassificationService.getAffectedCategories(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch affected categories");
      }
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Vendor hooks
 */
export function useVendors(filters?: { search?: string; categoryId?: string }) {
  return useQuery({
    queryKey: queryKeys.vendors.list(filters),
    queryFn: async () => {
      const response = await vendorService.getAll(filters);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch vendors");
      }
      return response.data || [];
    },
  });
}

export function useVendor(id: string | null) {
  return useQuery({
    queryKey: queryKeys.vendors.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const response = await vendorService.getById(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch vendor");
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useVendorImpact(id: string | null) {
  return useQuery({
    queryKey: [...queryKeys.vendors.detail(id!), "impact"],
    queryFn: async () => {
      if (!id) return null;
      const response = await vendorService.getImpact(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch vendor impact");
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await vendorService.create(data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create vendor");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.lists() });
      showSuccess("Vendor created successfully");
    },
    onError: (error: Error) => {
      showError("Failed to create vendor", error.message);
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await vendorService.update(id, data);
      if (!response.success) {
        throw new Error(response.error || "Failed to update vendor");
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.detail(variables.id) });
      showSuccess("Vendor updated successfully");
    },
    onError: (error: Error) => {
      showError("Failed to update vendor", error.message);
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await vendorService.delete(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete vendor");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.lists() });
      showSuccess("Vendor deleted successfully");
    },
    onError: (error: Error) => {
      showError("Failed to delete vendor", error.message);
    },
  });
}

/**
 * Corridor hooks
 */
export function useCorridors(filters?: {
  type?: string;
  search?: string;
  status?: "DRAFT" | "PUBLISHED" | "ALL";
}) {
  return useQuery({
    queryKey: queryKeys.corridors.list(filters),
    queryFn: async () => {
      const response = await corridorService.getAll(filters);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch corridors");
      }
      return response;
    },
  });
}

export function useCorridor(id: string | null) {
  return useQuery({
    queryKey: queryKeys.corridors.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const response = await corridorService.getById(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch corridor");
      }
      return response.data as any; // Full data object containing corridor, relations, details
    },
    enabled: !!id,
  });
}

export function useCreateCorridor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await corridorService.create(data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create corridor");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.corridors.lists() });
      showSuccess("Corridor created successfully");
    },
    onError: (error: Error) => {
      showError("Failed to create corridor", error.message);
    },
  });
}

export function useUpdateCorridor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await corridorService.update(id, data);
      if (!response.success) {
        throw new Error(response.error || "Failed to update corridor");
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.corridors.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.corridors.detail(variables.id) });
      showSuccess("Corridor updated successfully");
    },
    onError: (error: Error) => {
      showError("Failed to update corridor", error.message);
    },
  });
}

export function useDeleteCorridor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await corridorService.delete(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete corridor");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.corridors.lists() });
      showSuccess("Corridor deleted successfully");
    },
    onError: (error: Error) => {
      showError("Failed to delete corridor", error.message);
    },
  });
}

/**
 * Map Images hooks
 */
export function useMapImages(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.mapImages.list(params),
    queryFn: async () => {
      const response = await mapImageService.getAll(params);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch map images");
      }
      return response as any; // Return full response with pagination
    },
  });
}

export function useDeleteMapImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await mapImageService.delete(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete map image");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mapImages.all });
      showSuccess("Map image deleted successfully");
    },
    onError: (error: Error) => {
      showError("Failed to delete map image", error.message);
    },
  });
}

/**
 * Upload hooks
 */
export function useUploadImage() {
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      // Get signature
      const sigResponse = await uploadService.getSignature(type);
      if (!sigResponse.success || !sigResponse.data) {
        throw new Error(sigResponse.error || "Failed to get upload signature");
      }

      // Upload to Cloudinary
      const uploadResult = await uploadService.uploadToCloudinary(file, sigResponse.data);

      if (!uploadResult.secure_url) {
        throw new Error("No URL returned from Cloudinary");
      }

      return uploadResult.secure_url;
    },
    onSuccess: () => {
      showSuccess("Image uploaded successfully");
    },
    onError: (error: Error) => {
      showError("Upload failed", error.message);
    },
  });
}

/**
 * Cable Images hooks
 */
export function useCableImages(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.cableImages.list(params),
    queryFn: async () => {
      const response = await cableImageService.getAll(params);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch cable images");
      }
      return response as any;
    },
  });
}

export function useDeleteCableImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await cableImageService.delete(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete cable image");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cableImages.all });
      showSuccess("Cable image deleted successfully");
    },
    onError: (error: Error) => {
      showError("Failed to delete cable image", error.message);
    },
  });
}

export function useCreateCableImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await cableImageService.create(data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create cable image");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cableImages.all });
      showSuccess("Cable image created successfully");
    },
    onError: (error: Error) => {
      showError("Failed to create cable image", error.message);
    },
  });
}

export function useUpdateCableImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await cableImageService.update(id, data);
      if (!response.success) {
        throw new Error(response.error || "Failed to update cable image");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cableImages.all });
      showSuccess("Cable image updated successfully");
    },
    onError: (error: Error) => {
      showError("Failed to update cable image", error.message);
    },
  });
}

/**
 * Cable List hooks
 */
export function useCableList() {
  return useQuery({
    queryKey: queryKeys.cableList.all,
    queryFn: async () => {
      const response = await cableListService.getAll();
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch cable list");
      }
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Blog hooks
 */
export function useBlogs(filters?: {
  search?: string;
  status?: "DRAFT" | "PUBLISHED" | "ALL";
  type?: "general" | "corridor";
  corridorId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.blogs.list(filters),
    queryFn: async () => {
      const response = await blogService.getAll(filters);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch blogs");
      }
      return response;
    },
  });
}

export function useBlog(id: string | null) {
  return useQuery({
    queryKey: queryKeys.blogs.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const response = await blogService.getById(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch blog");
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useBlogBySlug(slug: string | null) {
  return useQuery({
    queryKey: queryKeys.blogs.bySlug(slug!),
    queryFn: async () => {
      if (!slug) return null;
      const response = await blogService.getBySlug(slug);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch blog");
      }
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useCreateBlog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await blogService.create(data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create blog");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blogs.lists() });
      showSuccess("Blog created successfully");
    },
    onError: (error: Error) => {
      showError("Failed to create blog", error.message);
    },
  });
}

export function useUpdateBlog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await blogService.update(id, data);
      if (!response.success) {
        throw new Error(response.error || "Failed to update blog");
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blogs.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.blogs.detail(variables.id) });
      showSuccess("Blog updated successfully");
    },
    onError: (error: Error) => {
      showError("Failed to update blog", error.message);
    },
  });
}

export function useDeleteBlog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await blogService.delete(id);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete blog");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blogs.lists() });
      showSuccess("Blog deleted successfully");
    },
    onError: (error: Error) => {
      showError("Failed to delete blog", error.message);
    },
  });
}

