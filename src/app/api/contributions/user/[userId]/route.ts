/**
 * GET /api/contributions/user/[userId]
 * Get user's contribution data and stats
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserContributionStats } from "../../../../../lib/ContributionService";

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

    const stats = await getUserContributionStats(userId);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching contribution stats:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch contribution stats" },
      { status: 500 }
    );
  }
}











