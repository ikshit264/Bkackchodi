/**
 * GET /api/badges/check
 * Check and award eligible badges for current user
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkAndAwardBadges } from "../../../../lib/BadgeService";
import { GetUserByUserId } from "../../../../components/actions/user/index";

export async function GET() {
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

    const awardedBadges = await checkAndAwardBadges(user.id);

    return NextResponse.json({
      success: true,
      data: {
        awardedCount: awardedBadges.length,
        awardedBadgeIds: awardedBadges,
      },
    });
  } catch (error) {
    console.error("Error checking badges:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to check badges" },
      { status: 500 }
    );
  }
}

