/**
 * POST /api/challenges/[challengeId]/leave - Leave a challenge
 * Downgrades SYNC_COPY access to COPY when user leaves
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../components/actions/user/index";
import { downgradeSyncCopyToCopy } from "../../../../../lib/SharingService";

export async function POST(
  _request: NextRequest,
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

    const user = await GetUserByUserId(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { challengeId } = await params;

    // Check if challenge exists
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId, isDeleted: false },
      select: { id: true, courseId: true, status: true },
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if user is a participant
    const participant = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId: user.id,
        },
      },
      select: { id: true, status: true, challengeCourseId: true },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: "You are not a participant in this challenge" },
        { status: 404 }
      );
    }

    if (participant.status === "LEFT") {
      return NextResponse.json(
        { success: false, error: "You have already left this challenge" },
        { status: 400 }
      );
    }

    // Downgrade SYNC_COPY to COPY if challenge has a course
    if (challenge.courseId) {
      try {
        await downgradeSyncCopyToCopy(user.id, challenge.courseId);
        console.log(`[LEAVE CHALLENGE] Downgraded SYNC_COPY to COPY for user ${user.id} on course ${challenge.courseId}`);
      } catch (error) {
        console.error("Error downgrading access:", error);
        // Continue even if downgrade fails
      }
    }

    // Update participant status to LEFT
    await prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        status: "LEFT",
        leftAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully left the challenge",
    });
  } catch (error) {
    console.error("Error leaving challenge:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to leave challenge" },
      { status: 500 }
    );
  }
}


