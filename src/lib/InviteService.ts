/**
 * Invite Service
 * Handles course invite creation, acceptance, and management
 */

import { prisma } from "./prisma";
import { CourseAccessLevel } from "@prisma/client";
import {
  cloneCourse,
  grantAccess,
  ensureSyncCopyAccess,
} from "./SharingService";
import { createNotification } from "./NotificationHelper";

/**
 * Sanitize user query input
 */
function sanitizeUserQuery(query: string): string {
  return query
    .trim()
    .slice(0, 100)
    .replace(/[<>\"'%;()&+]/g, "");
}

/**
 * Create course invite
 */
export async function createCourseInvite(
  courseId: string,
  fromUserId: string,
  toUserQuery: string,
  access: CourseAccessLevel
) {
  const sanitizedQuery = sanitizeUserQuery(toUserQuery);

  const toUser = await prisma.user.findFirst({
    where: {
      OR: [
        { userName: { contains: sanitizedQuery, mode: "insensitive" } },
        { email: { contains: sanitizedQuery, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (!toUser) {
    throw new Error("User not found");
  }

  const existingAccess = await prisma.courseAccess.findFirst({
    where: { 
      courseId,
      userId: toUser.id,
      isDeleted: false 
    },
  });

  if (existingAccess) {
    throw new Error("User already has access to this course");
  }

  const existingPending = await prisma.courseInvite.findFirst({
    where: { courseId, toUserId: toUser.id, status: "PENDING" },
  });

  if (existingPending) {
    if (existingPending.access !== access) {
      await prisma.courseInvite.update({
        where: { id: existingPending.id },
        data: { status: "CANCELLED" },
      });
    } else {
      throw new Error("Invite already pending with same access level");
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.courseInvite.create({
    data: {
      courseId,
      fromUserId,
      toUserId: toUser.id,
      access,
      status: "PENDING",
      expiresAt,
    },
  });

  await createNotification(toUser.id, "COURSE_INVITE", {
    inviteId: invite.id,
    courseId,
    fromUserId,
    access,
    expiresAt: expiresAt.toISOString(),
  });

  return invite;
}

/**
 * Accept course invite
 */
export async function acceptCourseInvite(inviteId: string, userId: string): Promise<void> {
  const invite = await prisma.courseInvite.findUnique({
    where: { id: inviteId },
    include: {
      course: {
        select: { id: true, isDeleted: true },
      },
    },
  });

  if (!invite) throw new Error("Invite not found");
  if (invite.toUserId !== userId) throw new Error("This invite is not for you");
  if (invite.status !== "PENDING") throw new Error("Invite has already been processed");

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    await prisma.courseInvite.update({
      where: { id: inviteId },
      data: { status: "EXPIRED" },
    });
    throw new Error("Invite has expired");
  }

  if (invite.course.isDeleted) {
    await prisma.courseInvite.update({
      where: { id: inviteId },
      data: { status: "CANCELLED" },
    });
    throw new Error("Course has been deleted");
  }

  // Step 1: Clone course if needed (outside transaction - has its own transaction and GitHub operations)
  if (invite.access === "COPY" || invite.access === "SYNC_COPY") {
    try {
      await cloneCourse({
        userId,
        sourceCourseId: invite.courseId,
        createGitHubRepos: true,
        retryOnFailure: true,
      });
    } catch (error: any) {
      console.error("[INVITE] Course cloning failed:", error);
      throw new Error(`Failed to clone course: ${error.message}`);
    }
  }

  // Step 2: Grant access and update invite status in a transaction
  await prisma.$transaction(
    async (tx) => {
      // Grant access (READ_ONLY, COPY, or SYNC_COPY) - use transaction client
      if (invite.access === "READ_ONLY") {
        // Check if access already exists
        const existing = await tx.courseAccess.findFirst({
          where: { courseId: invite.courseId, userId, isDeleted: false },
        });
        if (existing) {
          await tx.courseAccess.update({
            where: { id: existing.id },
            data: { access: invite.access, isDeleted: false, deletedAt: null },
          });
        } else {
          await tx.courseAccess.create({
            data: { courseId: invite.courseId, userId, access: invite.access },
          });
        }
      } else if (invite.access === "COPY") {
        // For COPY, ensure access exists (cloneCourse may have created it)
        const existing = await tx.courseAccess.findFirst({
          where: { courseId: invite.courseId, userId, isDeleted: false },
        });
        if (existing) {
          await tx.courseAccess.update({
            where: { id: existing.id },
            data: { access: invite.access, isDeleted: false, deletedAt: null },
          });
        } else {
          await tx.courseAccess.create({
            data: { courseId: invite.courseId, userId, access: invite.access },
          });
        }
      } else if (invite.access === "SYNC_COPY") {
        // For SYNC_COPY, ensure access is set correctly
        const existing = await tx.courseAccess.findFirst({
          where: { courseId: invite.courseId, userId, isDeleted: false },
        });
        if (existing) {
          if (existing.access === "READ_ONLY" || existing.access === "COPY") {
            await tx.courseAccess.update({
              where: { id: existing.id },
              data: { access: "SYNC_COPY" },
            });
          }
        } else {
          await tx.courseAccess.create({
            data: { courseId: invite.courseId, userId, access: "SYNC_COPY" },
          });
        }
      }

      // Update invite status
      await tx.courseInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" },
      });
    },
    {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
      timeout: 15000, // Maximum time the transaction can run (15 seconds)
    }
  );
}

/**
 * Reject course invite
 */
export async function rejectCourseInvite(inviteId: string, userId: string): Promise<void> {
  const invite = await prisma.courseInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) throw new Error("Invite not found");
  if (invite.toUserId !== userId) throw new Error("This invite is not for you");
  if (invite.status !== "PENDING") throw new Error("Invite has already been processed");

  await prisma.courseInvite.update({
    where: { id: inviteId },
    data: { status: "REJECTED" },
  });
}

/**
 * Cancel course invite (by sender)
 */
export async function cancelCourseInvite(inviteId: string, fromUserId: string): Promise<void> {
  const invite = await prisma.courseInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) throw new Error("Invite not found");
  if (invite.fromUserId !== fromUserId) throw new Error("You can only cancel your own invites");
  if (invite.status !== "PENDING") throw new Error("Invite has already been processed");

  await prisma.courseInvite.update({
    where: { id: inviteId },
    data: { status: "CANCELLED" },
  });
}

/**
 * Expire old invites (for cron job)
 */
export async function expireOldInvites(): Promise<number> {
  const now = new Date();
  const result = await prisma.courseInvite.updateMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return result.count;
}

/**
 * Validate invite
 */
export async function validateInvite(inviteId: string): Promise<{
  valid: boolean;
  invite?: any;
  reason?: string;
}> {
  const invite = await prisma.courseInvite.findUnique({
    where: { id: inviteId },
    include: {
      course: {
        select: { isDeleted: true },
      },
    },
  });

  if (!invite) return { valid: false, reason: "Invite not found" };
  if (invite.status !== "PENDING") return { valid: false, reason: `Invite has been ${invite.status.toLowerCase()}` };
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return { valid: false, reason: "Invite has expired" };
  if (invite.course.isDeleted) return { valid: false, reason: "Course has been deleted" };

  return { valid: true, invite };
}


