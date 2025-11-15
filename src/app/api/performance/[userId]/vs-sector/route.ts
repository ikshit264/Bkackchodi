/**
 * GET /api/performance/[userId]/vs-sector
 * Compare user with sector average
 * Note: Sectors are now CATEGORY type groups, so this is a wrapper around vs-group
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
    const sectorId = searchParams.get("sectorId");

    if (!sectorId) {
      return NextResponse.json(
        { success: false, error: "Sector ID is required" },
        { status: 400 }
      );
    }

    // Verify it's a CATEGORY group (sector)
    const { prisma } = await import("../../../../../lib/prisma");
    const group = await prisma.group.findUnique({
      where: { id: sectorId },
      select: { type: true },
    });

    if (!group || group.type !== "CATEGORY") {
      return NextResponse.json(
        { success: false, error: "Invalid sector ID" },
        { status: 400 }
      );
    }

    // Use the group comparison function
    const comparison = await compareWithGroupAverage(userId, sectorId);

    return NextResponse.json({ success: true, data: comparison });
  } catch (error) {
    console.error("Error comparing with sector:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to compare with sector" },
      { status: 500 }
    );
  }
}











