/**
 * API endpoint to mark user onboarding as complete
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";

/**
 * POST /api/user/onboarding-complete
 * Mark user onboarding as complete
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { userId: targetUserId } = body;

    // Get user from DB
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Only allow users to mark their own onboarding as complete
    const userIdToUpdate = targetUserId || dbUser.id;
    if (userIdToUpdate !== dbUser.id) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Update onboarding status
    await prisma.user.update({
      where: { id: userIdToUpdate },
      data: {
        onboardingCompleted: true,
      },
    });

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding status", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

