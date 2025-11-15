/**
 * POST /api/badges/init
 * Initialize default badges (admin/internal use)
 */

import { NextResponse } from "next/server";
import { initializeDefaultBadges } from "../../../../lib/BadgeService";

export async function POST() {
  try {
    // TODO: Add admin check here
    const count = await initializeDefaultBadges();

    return NextResponse.json({
      success: true,
      message: `Initialized ${count} default badges`,
      count,
    });
  } catch (error) {
    console.error("Error initializing badges:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initialize badges" },
      { status: 500 }
    );
  }
}


