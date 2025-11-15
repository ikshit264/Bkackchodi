/**
 * GET /api/sectors/onboarding
 * Get sectors for onboarding (category groups only)
 */

import { NextResponse } from "next/server";
import { getCategoryGroups } from "../../../../lib/GroupService";

export async function GET() {
  try {
    const sectors = await getCategoryGroups();

    return NextResponse.json({
      success: true,
      data: sectors,
    });
  } catch (error) {
    console.error("Error fetching sectors for onboarding:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sectors",
      },
      { status: 500 }
    );
  }
}


