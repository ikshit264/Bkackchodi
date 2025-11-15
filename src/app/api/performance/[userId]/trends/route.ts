/**
 * GET /api/performance/[userId]/trends
 * Get performance trends
 */

import { NextRequest, NextResponse } from "next/server";
import { getPerformanceTrends } from "../../../../../lib/PerformanceService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const trends = await getPerformanceTrends(userId, days);

    return NextResponse.json({ success: true, data: trends });
  } catch (error) {
    console.error("Error fetching trends:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch trends" },
      { status: 500 }
    );
  }
}

