/**
 * PATCH /api/challenges/[challengeId]/update-progress - Update progress
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateChallengeProgress } from "../../../../../lib/ChallengeService";
import { GetUserByUserId } from "../../../../../components/actions/user/index";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { challengeId } = await params;
    const body = await request.json();
    const { updates } = body;

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid updates object" },
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

    await updateChallengeProgress(challengeId, user.id, updates);

    return NextResponse.json({
      success: true,
      message: "Progress updated successfully",
    });
  } catch (error) {
    console.error("Error updating challenge progress:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update progress" },
      { status: 500 }
    );
  }
}











