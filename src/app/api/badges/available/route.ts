/**
 * GET /api/badges/available
 * Get available badges for current user (not yet earned)
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAvailableBadges } from "../../../../lib/BadgeService";
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

    const availableBadges = await getAvailableBadges(user.id);

    return NextResponse.json({ success: true, data: availableBadges });
  } catch (error) {
    console.error("Error fetching available badges:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch available badges" },
      { status: 500 }
    );
  }
}

