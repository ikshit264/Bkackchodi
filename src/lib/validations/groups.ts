/**
 * Zod validation schemas for Group API endpoints
 */
import { z } from "zod";

// Group name validation: 3-50 characters, alphanumeric, spaces, hyphens, underscores
const groupNameRegex = /^[a-zA-Z0-9\s\-_]{3,50}$/;

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, "Group name must be at least 3 characters")
    .max(50, "Group name must be at most 50 characters")
    .regex(groupNameRegex, "Group name can only contain letters, numbers, spaces, hyphens, and underscores")
    .refine((val) => val.trim().length >= 3, "Group name cannot be only whitespace"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
  type: z.enum(["CUSTOM", "CATEGORY"]).optional().default("CUSTOM"),
  icon: z
    .string()
    .max(200, "Icon URL must be at most 200 characters")
    .optional()
    .nullable()
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://") || /^[\p{Emoji}\p{Symbol}]+$/u.test(val),
      "Icon must be a valid URL or emoji"
    ),
  isPrivate: z.boolean().optional().default(true),
});

export const updateGroupSchema = z.object({
  name: z
    .string()
    .min(3, "Group name must be at least 3 characters")
    .max(50, "Group name must be at most 50 characters")
    .regex(groupNameRegex, "Group name can only contain letters, numbers, spaces, hyphens, and underscores")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .nullable(),
  icon: z
    .string()
    .max(200, "Icon URL must be at most 200 characters")
    .optional()
    .nullable()
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://") || /^[\p{Emoji}\p{Symbol}]+$/u.test(val),
      "Icon must be a valid URL or emoji"
    ),
  isPrivate: z.boolean().optional(),
});

export const joinGroupSchema = z.object({
  groupId: z.string().uuid("Invalid group ID format"),
});

export const leaveGroupSchema = z.object({
  groupId: z.string().uuid("Invalid group ID format"),
});

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid("Invalid user ID format"),
});

export const manageMemberSchema = z.object({
  action: z.enum(["promote", "demote", "remove"]),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional(),
});

export const inviteUserSchema = z.object({
  query: z.string().min(1, "Search query is required").max(100, "Search query too long"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional().default("MEMBER"),
});

export const syncGroupScoreSchema = z.object({
  userId: z.string().uuid().optional(), // If not provided, sync for authenticated user
});

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
export type LeaveGroupInput = z.infer<typeof leaveGroupSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type ManageMemberInput = z.infer<typeof manageMemberSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type SyncGroupScoreInput = z.infer<typeof syncGroupScoreSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;

