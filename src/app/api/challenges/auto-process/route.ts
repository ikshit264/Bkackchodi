/**
 * POST /api/challenges/auto-process
 * Auto-activate challenges and auto-complete expired challenges
 * This should be called by a cron job or scheduled task
 */

import { NextResponse } from "next/server";
import {
  autoActivateChallenges,
  autoCompleteExpiredChallenges,
} from "../../../../lib/EnhancedChallengeService";

export async function POST() {
  try {
    // Check for admin/authorized access (optional - can be called by cron)
    // For now, allow anyone to call it (you can add auth if needed)

    // Auto-activate challenges
    await autoActivateChallenges();

    // Auto-complete expired challenges
    await autoCompleteExpiredChallenges();

    return NextResponse.json({
      success: true,
      message: "Auto-processing completed",
    });
  } catch (error) {
    console.error("Error in auto-processing challenges:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to auto-process challenges" },
      { status: 500 }
    );
  }
}

// Also allow GET for easier cron job setup
export async function GET() {
  return POST();
}

