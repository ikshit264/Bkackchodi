/**
 * POST /api/challenges/[challengeId]/activate - Manually activate challenge
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../components/actions/user/index";
import { isAdmin } from "../../../../../utils/admin";
import { createNotification } from "../../../../../lib/NotificationHelper";

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

    const user = await GetUserByUserId(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { challengeId } = await params;

    // Get challenge
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check permissions: creator or admin
    const adminCheck = await isAdmin();
    if (challenge.createdBy !== user.id && !adminCheck) {
      return NextResponse.json(
        { success: false, error: "Only challenge creator or admin can activate challenges" },
        { status: 403 }
      );
    }

    if (challenge.status === "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Challenge is already active" },
        { status: 400 }
      );
    }

    if (challenge.status === "COMPLETED" || challenge.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: `Cannot activate a ${challenge.status.toLowerCase()} challenge` },
        { status: 400 }
      );
    }

    // Activate challenge
    const updated = await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: "ACTIVE" },
    });

    // Automatically "join" all participants who were in JOINED status
    // This ensures they're ready to participate when the challenge activates
    try {
      await prisma.challengeParticipant.updateMany({
        where: {
          challengeId,
          status: "JOINED",
        },
        data: {
          status: "IN_PROGRESS", // Automatically move to IN_PROGRESS when challenge activates
        },
      });
    } catch (error) {
      console.error("Error updating participant statuses on activation:", error);
    }

    // Notify all participants
    try {
      const participants = await prisma.challengeParticipant.findMany({
        where: { challengeId },
        select: { userId: true },
      });

      for (const participant of participants) {
        await createNotification(participant.userId, "CHALLENGE_ACTIVATED", {
          challengeId: challenge.id,
          challengeName: challenge.name,
        });
      }
    } catch (error) {
      console.error("Error sending activation notifications:", error);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error activating challenge:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to activate challenge" },
      { status: 500 }
    );
  }
}

