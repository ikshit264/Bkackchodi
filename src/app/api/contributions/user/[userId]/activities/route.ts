/**
 * GET /api/contributions/user/[userId]/activities
 * Get detailed activity log for a user (all activities on each day)
 */

import { NextRequest, NextResponse } from "next/server";
import { getActivityLog } from "../../../../../../lib/UnifiedStreakService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const days = parseInt(searchParams.get("days") || "30");

    let startDate: Date;
    let endDate: Date = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
    }

    const activityLog = await getActivityLog(userId, startDate, endDate);

    return NextResponse.json({ success: true, data: activityLog });
  } catch (error) {
    console.error("Error fetching activity log:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch activity log" },
      { status: 500 }
    );
  }
}











