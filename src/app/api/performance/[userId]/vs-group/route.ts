/**
 * GET /api/performance/[userId]/vs-group
 * Compare user with group average
 */

import { NextRequest, NextResponse } from "next/server";
import { compareWithGroupAverage } from "../../../../../lib/PerformanceService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Group ID is required" },
        { status: 400 }
      );
    }

    const comparison = await compareWithGroupAverage(userId, groupId);

    return NextResponse.json({ success: true, data: comparison });
  } catch (error) {
    console.error("Error comparing with group:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to compare with group" },
      { status: 500 }
    );
  }
}

