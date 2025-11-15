/**
 * GET /api/locations/popular
 * Get popular locations
 */

import { NextResponse } from "next/server";
import { getPopularLocations } from "../../../../lib/LocationService";

export async function GET() {
  try {
    const locations = await getPopularLocations();

    return NextResponse.json({ success: true, data: locations });
  } catch (error) {
    console.error("Error fetching popular locations:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch popular locations" },
      { status: 500 }
    );
  }
}


