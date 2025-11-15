/**
 * GET /api/analytics/user/[userId] - User analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserAnalytics } from "../../../../../lib/AnalyticsService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const analytics = await getUserAnalytics(userId);

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}











