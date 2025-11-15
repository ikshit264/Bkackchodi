/**
 * POST /api/challenges/invites/[inviteId]/accept - Accept challenge invite
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../../components/actions/user/index";
import {
  cloneCourseForChallenge,
  createProjectCourseForChallenge,
  calculateChallengePoints,
  updateChallengeRankings,
} from "../../../../../../lib/EnhancedChallengeService";
import { ensureSyncCopyAccess } from "../../../../../../lib/SharingService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await GetUserByUserId(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { inviteId } = await params;

    // Get invite
    const invite = await prisma.challengeInvite.findUnique({
      where: { id: inviteId },
      include: {
        challenge: {
          include: {
            course: true,
            project: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invite not found" },
        { status: 404 }
      );
    }

    if (invite.toUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: "This invite is not for you" },
        { status: 403 }
      );
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Invite has already been processed" },
        { status: 400 }
      );
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return NextResponse.json(
        { success: false, error: "Invite has expired" },
        { status: 400 }
      );
    }

    // Check if challenge is still valid
    if (invite.challenge.isDeleted) {
      return NextResponse.json(
        { success: false, error: "Challenge has been deleted" },
        { status: 400 }
      );
    }

    if (invite.challenge.status === "COMPLETED" || invite.challenge.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: `Cannot join a ${invite.challenge.status.toLowerCase()} challenge` },
        { status: 400 }
      );
    }

    // Clone course/project if challenge has one
    let challengeCourseId: string | null = null;
    let challengeProjectId: string | null = null;

    if (invite.challenge.courseId) {
      try {
        challengeCourseId = await cloneCourseForChallenge(
          user.id,
          invite.challenge.courseId
        );

        // Ensure SYNC_COPY access (challenges automatically grant SYNC_COPY)
        await ensureSyncCopyAccess(user.id, invite.challenge.courseId);
      } catch (error) {
        console.error("Error cloning course for challenge:", error);
        return NextResponse.json(
          { success: false, error: `Failed to clone course: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 500 }
        );
      }
    } else if (invite.challenge.projectId) {
      try {
        challengeCourseId = await createProjectCourseForChallenge(
          user.id,
          invite.challenge.projectId,
          invite.challenge.name
        );
        challengeProjectId = invite.challenge.projectId;
      } catch (error) {
        console.error("Error creating project course for challenge:", error);
        return NextResponse.json(
          { success: false, error: `Failed to create project course: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 500 }
        );
      }
    }

    // Create participant with status based on challenge status
    const participant = await prisma.challengeParticipant.create({
      data: {
        challengeId: invite.challengeId,
        userId: user.id,
        status: invite.challenge.status === "DRAFT" ? "JOINED" : "IN_PROGRESS",
        progress: {},
        challengeCourseId,
        challengeProjectId,
      },
    });

    // Calculate initial points
    if (challengeCourseId) {
      try {
        const points = await calculateChallengePoints(user.id, invite.challengeId);
        await prisma.challengeParticipant.update({
          where: { id: participant.id },
          data: { points },
        });
        await updateChallengeRankings(invite.challengeId);
      } catch (error) {
        console.error("Error calculating initial points:", error);
      }
    }

    // Update invite status
    await prisma.challengeInvite.update({
      where: { id: inviteId },
      data: { status: "ACCEPTED" },
    });

    return NextResponse.json({
      success: true,
      data: {
        participant,
        challengeCourseId,
        challengeId: invite.challengeId,
      },
    });
  } catch (error) {
    console.error("Error accepting challenge invite:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to accept invite" },
      { status: 500 }
    );
  }
}
