import { z } from "zod";

/**
 * Category Classification validation schemas
 */

export const categoryClassificationSchema = z.object({
    name: z.string().min(1, "Name is required").trim(),
    description: z.string().optional(),
});

export type CategoryClassificationInput = z.infer<typeof categoryClassificationSchema>;
