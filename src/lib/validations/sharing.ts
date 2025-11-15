/**
 * Zod validation schemas for Sharing API endpoints
 */
import { z } from "zod";

export const courseAccessLevelSchema = z.enum(["READ_ONLY", "COPY", "SYNC_COPY"]);

export const createCourseInviteSchema = z.object({
  toUserQuery: z
    .string()
    .min(2, "Search query must be at least 2 characters")
    .max(100, "Search query must be less than 100 characters")
    .refine((val) => !/[<>\"'%;()&+]/.test(val), "Search query contains invalid characters"),
  access: courseAccessLevelSchema,
});

export const updateCourseAccessSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID"),
  newAccess: courseAccessLevelSchema,
});

export const removeCourseAccessSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export type CreateCourseInviteInput = z.infer<typeof createCourseInviteSchema>;
export type UpdateCourseAccessInput = z.infer<typeof updateCourseAccessSchema>;
export type RemoveCourseAccessInput = z.infer<typeof removeCourseAccessSchema>;


