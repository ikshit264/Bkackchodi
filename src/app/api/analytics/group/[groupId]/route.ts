/**
 * GET /api/analytics/group/[groupId] - Group analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { getGroupAnalytics } from "../../../../../lib/AnalyticsService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    const analytics = await getGroupAnalytics(groupId);

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error fetching group analytics:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}











