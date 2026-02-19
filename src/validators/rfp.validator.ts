import { z } from "zod";

export const rfpSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(150, "Full name cannot exceed 150 characters")
    .trim(),
  company: z
    .string()
    .min(1, "Company is required")
    .max(150, "Company cannot exceed 150 characters")
    .trim(),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters")
    .trim()
    .toLowerCase(),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .max(50, "Phone number cannot exceed 50 characters")
    .trim(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message cannot exceed 2000 characters")
    .trim(),
});

export type RfpInput = z.infer<typeof rfpSchema>;
