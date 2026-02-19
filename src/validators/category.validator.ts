import { z } from "zod";

/**
 * Category validation schemas
 */

export const categorySchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().optional(),
  classificationIds: z.array(z.string()).default([]),
});

export type CategoryInput = z.infer<typeof categorySchema>;
