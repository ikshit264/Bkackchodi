/**
 * POST /api/contributions/track
 * Track a contribution (internal use)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { trackContribution } from "../../../../lib/ContributionService";
import { ContributionType } from "@prisma/client";
import { GetUserByUserId } from "../../../../components/actions/user/index";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, metadata } = body;

    if (!type || !Object.values(ContributionType).includes(type)) {
      return NextResponse.json(
        { success: false, error: "Valid contribution type is required" },
        { status: 400 }
      );
    }

    const user = await GetUserByUserId(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    await trackContribution(user.id, type as ContributionType, metadata);

    return NextResponse.json({
      success: true,
      message: "Contribution tracked successfully",
    });
  } catch (error) {
    console.error("Error tracking contribution:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to track contribution" },
      { status: 500 }
    );
  }
}











