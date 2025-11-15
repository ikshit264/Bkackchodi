/**
 * GET /api/leaderboard/country/[country]
 * Get country leaderboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getCountryLeaderboard } from "../../../../../lib/LocationService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ country: string }> }
) {
  try {
    const { country } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    const decodedCountry = decodeURIComponent(country);
    const leaderboard = await getCountryLeaderboard(decodedCountry, limit);

    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error("Error fetching country leaderboard:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch country leaderboard" },
      { status: 500 }
    );
  }
}

