import { z } from "zod";

/**
 * Vendor validation schemas
 */

export const vendorSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().optional(),
  logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
  website: z.string().optional().refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "Invalid website URL" }
  ),
  categoryIds: z.array(z.string().min(1, "Category ID is required")).min(1, "At least one category is required"),
});

export type VendorInput = z.infer<typeof vendorSchema>;


