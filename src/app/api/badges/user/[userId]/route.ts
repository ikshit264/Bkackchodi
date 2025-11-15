/**
 * GET /api/badges/user/[userId]
 * Get user's badges
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserBadges } from "../../../../../lib/BadgeService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const userBadges = await getUserBadges(userId);

    return NextResponse.json({ success: true, data: userBadges });
  } catch (error) {
    console.error("Error fetching user badges:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch user badges" },
      { status: 500 }
    );
  }
}

