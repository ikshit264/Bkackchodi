/**
 * GET /api/leaderboard/city/[city]
 * Get city leaderboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getCityLeaderboard } from "../../../../../lib/LocationService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    const decodedCity = decodeURIComponent(city);
    const leaderboard = await getCityLeaderboard(decodedCity, limit);

    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error("Error fetching city leaderboard:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch city leaderboard" },
      { status: 500 }
    );
  }
}

