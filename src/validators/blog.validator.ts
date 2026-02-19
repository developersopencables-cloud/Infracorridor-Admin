import { z } from "zod";

/**
 * Blog validation schemas
 */

// Base schema without refinement (for partial use)
const blogBaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters").trim(),
  content: z.string().min(1, "Content is required"),
  authorName: z.string().trim().optional(),
  coverImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  coverImagePublicId: z.string().optional(),
  type: z.enum(["general", "corridor"]),
  corridorIds: z.array(z.string()).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  // SEO fields
  keywords: z.array(z.string().trim())
    .max(10, "Maximum 10 keywords allowed")
    .optional()
    .default([]),
  metaTitle: z.string()
    .max(60, "Meta title must be 60 characters or less")
    .optional(),
  metaDescription: z.string()
    .max(160, "Meta description must be 160 characters or less")
    .optional(),
  focusKeyphrase: z.string().max(100, "Focus keyphrase must be 100 characters or less").optional(),
  canonicalUrl: z.string().url("Invalid canonical URL").optional().or(z.literal("")),
});

// Full schema with corridor validation
export const blogSchema = blogBaseSchema.refine(
  (data) => data.type !== "corridor" || (data.corridorIds && data.corridorIds.length > 0),
  {
    message: "At least one corridor is required when type is 'corridor'",
    path: ["corridorIds"],
  }
);

// Update schema - partial fields without the refine constraint
export const blogUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters").trim().optional(),
  content: z.string().min(1, "Content is required").optional(),
  authorName: z.string().trim().optional(),
  coverImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  coverImagePublicId: z.string().optional(),
  type: z.enum(["general", "corridor"]).optional(),
  corridorIds: z.array(z.string()).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  // SEO fields
  keywords: z.array(z.string().trim())
    .max(10, "Maximum 10 keywords allowed")
    .optional(),
  metaTitle: z.string()
    .max(60, "Meta title must be 60 characters or less")
    .optional(),
  metaDescription: z.string()
    .max(160, "Meta description must be 160 characters or less")
    .optional(),
  focusKeyphrase: z.string().max(100, "Focus keyphrase must be 100 characters or less").optional(),
  canonicalUrl: z.string().url("Invalid canonical URL").optional().or(z.literal("")),
});

export type BlogInput = z.infer<typeof blogSchema>;
export type BlogUpdateInput = z.infer<typeof blogUpdateSchema>;
