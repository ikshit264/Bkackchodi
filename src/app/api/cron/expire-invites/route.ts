import { NextRequest, NextResponse } from "next/server";
import { expireOldInvites } from "../../../../lib/InviteService";

export async function GET(request: NextRequest) {
  try {
    // Optional: Add API key check for security
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.CRON_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expiredCount = await expireOldInvites();

    return NextResponse.json({
      success: true,
      expiredCount,
      message: `Expired ${expiredCount} invites`,
    });
  } catch (error) {
    console.error("Error expiring invites:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}


