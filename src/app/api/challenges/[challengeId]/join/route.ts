/**
 * POST /api/challenges/[challengeId]/join - Join challenge
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../components/actions/user/index";
import {
  cloneCourseForChallenge,
  createProjectCourseForChallenge,
  calculateChallengePoints,
  updateChallengeRankings,
} from "../../../../../lib/EnhancedChallengeService";
import { ensureSyncCopyAccess } from "../../../../../lib/SharingService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { challengeId } = await params;

    const user = await GetUserByUserId(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if challenge exists and is joinable
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Allow joining DRAFT and ACTIVE challenges
    if (challenge.status === "COMPLETED" || challenge.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: `Cannot join a ${challenge.status.toLowerCase()} challenge` },
        { status: 400 }
      );
    }

    // Check if user is already a participant
    const existing = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId: user.id,
        },
      },
    });

    if (existing && existing.status !== "LEFT") {
      return NextResponse.json(
        { success: false, error: "Already participating in this challenge" },
        { status: 400 }
      );
    }

    // Check participant limit
    if (challenge.maxParticipants) {
      const participantCount = await prisma.challengeParticipant.count({
        where: {
          challengeId,
          status: {
            in: ["JOINED", "IN_PROGRESS", "COMPLETED"],
          },
        },
      });

      if (participantCount >= challenge.maxParticipants) {
        return NextResponse.json(
          { success: false, error: "Challenge is full" },
          { status: 400 }
        );
      }
    }

    // Check sector/group membership if required
    if (challenge.sectorId) {
      const membership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: challenge.sectorId,
          },
        },
      });

      if (!membership || membership.leftAt) {
        return NextResponse.json(
          { success: false, error: "You must be a member of the sector to join this challenge" },
          { status: 403 }
        );
      }
    }

    if (challenge.groupId) {
      const membership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: challenge.groupId,
          },
        },
      });

      if (!membership || membership.leftAt) {
        return NextResponse.json(
          { success: false, error: "You must be a member of the group to join this challenge" },
          { status: 403 }
        );
      }
    }

    // Clone course/project if challenge has one
    let challengeCourseId: string | null = null;
    let challengeProjectId: string | null = null;

    if (challenge.courseId) {
      try {
        challengeCourseId = await cloneCourseForChallenge(user.id, challenge.courseId);

        // Ensure SYNC_COPY access (challenges automatically grant SYNC_COPY)
        await ensureSyncCopyAccess(user.id, challenge.courseId);
      } catch (error) {
        console.error("Error cloning course for challenge:", error);
        return NextResponse.json(
          { success: false, error: `Failed to clone course: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 500 }
        );
      }
    } else if (challenge.projectId) {
      try {
        challengeCourseId = await createProjectCourseForChallenge(
          user.id,
          challenge.projectId,
          challenge.name
        );
        challengeProjectId = challenge.projectId;
      } catch (error) {
        console.error("Error creating project course for challenge:", error);
        return NextResponse.json(
          { success: false, error: `Failed to create project course: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 500 }
        );
      }
    }

    // Create or reactivate participation
    const participant = await prisma.challengeParticipant.upsert({
      where: {
        challengeId_userId: {
          challengeId,
          userId: user.id,
        },
      },
      update: {
        status: challenge.status === "DRAFT" ? "JOINED" : "IN_PROGRESS",
        progress: {},
        completedAt: null,
        joinedAt: new Date(),
        challengeCourseId,
        challengeProjectId,
      },
      create: {
        challengeId,
        userId: user.id,
        status: challenge.status === "DRAFT" ? "JOINED" : "IN_PROGRESS",
        progress: {},
        challengeCourseId,
        challengeProjectId,
      },
    });

    // Calculate initial points
    if (challengeCourseId) {
      try {
        const points = await calculateChallengePoints(user.id, challengeId);
        await prisma.challengeParticipant.update({
          where: { id: participant.id },
          data: { points },
        });
        await updateChallengeRankings(challengeId);
      } catch (error) {
        console.error("Error calculating initial points:", error);
      }
    }

    return NextResponse.json({ success: true, data: participant });
  } catch (error) {
    console.error("Error joining challenge:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to join challenge" },
      { status: 500 }
    );
  }
}
