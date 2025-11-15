/**
 * Sector Score API - Redirects to Groups Score API
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectorId: string; userId: string }> }
) {
  try {
    const { sectorId, userId } = await params;
    const url = new URL(request.url);
    
    // Get group leaderboard and find user's score
    const response = await fetch(`${url.origin}/api/groups/${sectorId}/leaderboard`, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch score" },
        { status: response.status }
      );
    }

    const leaderboardData = await response.json();
    const userEntry = leaderboardData.data?.find((entry: { userId: string }) => entry.userId === userId);

    if (!userEntry) {
      return NextResponse.json(
        { error: "User score not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        rank: userEntry.rank,
        score: userEntry.finalScore || userEntry.score,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching sector score:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
