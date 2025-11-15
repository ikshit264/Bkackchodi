/**
 * POST /api/badges/award
 * Award badge to user (admin/internal use)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { awardBadge } from "../../../../lib/BadgeService";
import { GetUserByUserId } from "../../../../components/actions/user/index";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Add admin check here
    // For now, allow any authenticated user to award badges to themselves

    const body = await request.json();
    const { badgeId, targetUserId } = body;

    if (!badgeId) {
      return NextResponse.json(
        { success: false, error: "Badge ID is required" },
        { status: 400 }
      );
    }

    const user = await GetUserByUserId(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const targetUser = targetUserId || user.id;
    const awarded = await awardBadge(targetUser, badgeId);

    if (!awarded) {
      return NextResponse.json(
        { success: false, error: "Badge could not be awarded (may already be awarded or criteria not met)" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Badge awarded successfully",
    });
  } catch (error) {
    console.error("Error awarding badge:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to award badge" },
      { status: 500 }
    );
  }
}

