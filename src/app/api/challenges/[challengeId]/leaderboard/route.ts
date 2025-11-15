/**
 * GET /api/challenges/[challengeId]/leaderboard - Challenge leaderboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getChallengeLeaderboard } from "../../../../../lib/ChallengeService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params;

    const leaderboard = await getChallengeLeaderboard(challengeId);

    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error("Error fetching challenge leaderboard:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}











