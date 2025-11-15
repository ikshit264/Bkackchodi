/**
 * GET /api/contributions/user/[userId]/heatmap
 * Get heatmap data for a specific year
 */

import { NextRequest, NextResponse } from "next/server";
import { generateHeatmapMatrix } from "../../../../../../lib/ContributionService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { success: false, error: "Invalid year" },
        { status: 400 }
      );
    }

    const matrix = await generateHeatmapMatrix(userId, year);
    const stats = await import("../../../../../../lib/ContributionService").then(
      (m) => m.getUserContributionStats(userId)
    );

    // Get available years (from first contribution to current year)
    const { prisma } = await import("../../../../../../lib/prisma");
    const firstContribution = await prisma.dailyContribution.findFirst({
      where: { userId },
      orderBy: { date: "asc" },
      select: { date: true },
    });

    const currentYear = new Date().getFullYear();
    const firstYear = firstContribution
      ? new Date(firstContribution.date).getFullYear()
      : currentYear;
    const availableYears: number[] = [];
    for (let y = firstYear; y <= currentYear; y++) {
      availableYears.push(y);
    }

    return NextResponse.json({
      success: true,
      data: {
        matrix,
        stats: await stats,
        year,
        availableYears,
      },
    });
  } catch (error) {
    console.error("Error fetching heatmap:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch heatmap" },
      { status: 500 }
    );
  }
}











