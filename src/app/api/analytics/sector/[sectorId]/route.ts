/**
 * GET /api/analytics/sector/[sectorId] - Sector analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { getSectorAnalytics } from "../../../../../lib/AnalyticsService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectorId: string }> }
) {
  try {
    const { sectorId } = await params;

    const analytics = await getSectorAnalytics(sectorId);

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error fetching sector analytics:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}











