/**
 * GET /api/performance/[userId]/compare/[otherUserId]
 * Compare two users' performance
 */

import { NextRequest, NextResponse } from "next/server";
import { compareUsers } from "../../../../../../lib/PerformanceService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; otherUserId: string }> }
) {
  try {
    const { userId, otherUserId } = await params;

    if (!userId || !otherUserId) {
      return NextResponse.json(
        { success: false, error: "User IDs are required" },
        { status: 400 }
      );
    }

    const comparison = await compareUsers(userId, otherUserId);

    return NextResponse.json({ success: true, data: comparison });
  } catch (error) {
    console.error("Error comparing users:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to compare users" },
      { status: 500 }
    );
  }
}

