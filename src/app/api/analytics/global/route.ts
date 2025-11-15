/**
 * GET /api/analytics/global - Global analytics (admin only)
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGlobalAnalytics } from "../../../../lib/AnalyticsService";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Add admin check
    const analytics = await getGlobalAnalytics();

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error fetching global analytics:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}











