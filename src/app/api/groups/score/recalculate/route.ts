/**
 * API endpoint to manually recalculate group and global scores
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateGroupScore } from "../../../../../lib/GroupScoreCalculator";
import { updateGlobalScore } from "../../../../../lib/GlobalScoreCalculator";
import { prisma } from "../../../../../../lib/prisma";

/**
 * POST /api/groups/score/recalculate
 * Recalculate scores (admin or user-specific)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, groupId, allGroups } = body;

    // Get DB user
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetUserId = userId || dbUser.id;

    // If recalculating for another user, check admin (optional security check)
    // For now, allowing users to recalculate their own scores

    if (allGroups) {
      // Recalculate all groups for this user
      const memberships = await prisma.groupMembership.findMany({
        where: {
          userId: targetUserId,
          leftAt: null,
        },
        select: {
          groupId: true,
        },
      });

      await Promise.all(
        memberships.map((m) => updateGroupScore(targetUserId, m.groupId))
      );

      await updateGlobalScore(targetUserId, true);

      return NextResponse.json(
        {
          success: true,
          message: `Recalculated scores for ${memberships.length} groups`,
        },
        { status: 200 }
      );
    } else if (groupId) {
      // Recalculate specific group
      await updateGroupScore(targetUserId, groupId);
      await updateGlobalScore(targetUserId, true);

      return NextResponse.json(
        {
          success: true,
          message: "Group score recalculated",
        },
        { status: 200 }
      );
    } else {
      // Recalculate all groups for user
      const memberships = await prisma.groupMembership.findMany({
        where: {
          userId: targetUserId,
          leftAt: null,
        },
        select: {
          groupId: true,
        },
      });

      await Promise.all(
        memberships.map((m) => updateGroupScore(targetUserId, m.groupId))
      );

      await updateGlobalScore(targetUserId, true);

      return NextResponse.json(
        {
          success: true,
          message: "All scores recalculated",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error recalculating scores:", error);
    return NextResponse.json(
      {
        error: "Failed to recalculate scores",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

