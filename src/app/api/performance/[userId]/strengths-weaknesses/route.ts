/**
 * GET /api/performance/[userId]/strengths-weaknesses
 * Get strengths and weaknesses analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { getStrengthsWeaknesses } from "../../../../../lib/PerformanceService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const analysis = await getStrengthsWeaknesses(userId);

    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch analysis" },
      { status: 500 }
    );
  }
}

