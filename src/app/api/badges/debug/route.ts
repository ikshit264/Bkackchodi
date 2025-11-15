/**
 * GET /api/badges/debug
 * Debug endpoint to check badge system status
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { GetUserByUserId } from "../../../../components/actions/user/index";
import { checkBadgeEligibility } from "../../../../lib/BadgeService";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await GetUserByUserId(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get user's score data
    const score = await prisma.score.findUnique({
      where: { userId: user.id },
    });

    // Get all badges
    const allBadges = await prisma.badge.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Get user's earned badges
    const earnedBadges = await prisma.userBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
    });

    // Check eligibility for GitHub badges
    const githubBadges = allBadges.filter((b) => b.category === "GITHUB");
    const eligibilityChecks = await Promise.all(
      githubBadges.map(async (badge) => {
        const check = await checkBadgeEligibility(user.id, badge.id);
        return {
          badgeName: badge.name,
          criteria: badge.criteria,
          eligible: check.eligible,
          progress: check.progress,
          maxProgress: check.maxProgress,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          userName: user.userName,
        },
        score: score
          ? {
              commits: score.commits,
              pullRequests: score.pullRequests,
              reviews: score.review,
              issues: score.issue,
              currentStreak: score.currentStreak,
              longestStreak: score.longestStreak,
              totalActiveDays: score.totalActiveDays,
            }
          : null,
        badges: {
          total: allBadges.length,
          earned: earnedBadges.length,
          githubBadges: githubBadges.length,
        },
        eligibilityChecks,
        earnedBadges: earnedBadges.map((ub) => ({
          name: ub.badge.name,
          category: ub.badge.category,
          earnedAt: ub.earnedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to debug" },
      { status: 500 }
    );
  }
}











