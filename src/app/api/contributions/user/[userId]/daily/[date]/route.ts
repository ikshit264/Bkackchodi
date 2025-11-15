/**
 * GET /api/contributions/user/[userId]/daily/[date]
 * Get specific day's contributions
 */

import { NextRequest, NextResponse } from "next/server";
import { getDailyContributions } from "../../../../../../../lib/ContributionService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; date: string }> }
) {
  try {
    const { userId, date } = await params;

    if (!userId || !date) {
      return NextResponse.json(
        { success: false, error: "User ID and date are required" },
        { status: 400 }
      );
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 }
      );
    }

    const contributions = await getDailyContributions(userId, dateObj);

    return NextResponse.json({ success: true, data: contributions });
  } catch (error) {
    console.error("Error fetching daily contributions:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch daily contributions" },
      { status: 500 }
    );
  }
}











