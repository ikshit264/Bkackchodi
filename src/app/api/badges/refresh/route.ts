/**
 * POST /api/badges/refresh
 * Manually trigger badge calculation and awarding for current user
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkAndAwardBadges } from "../../../../lib/BadgeService";
import { GetUserByUserId } from "../../../../components/actions/user/index";
import { prisma } from "../../../../lib/prisma";

export async function POST() {
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

    // Check if badges exist, if not initialize them
    const badgeCount = await prisma.badge.count();
    if (badgeCount === 0) {
      console.log("No badges found, initializing default badges...");
      const { initializeDefaultBadges } = await import("../../../../lib/BadgeService");
      await initializeDefaultBadges();
      console.log("Default badges initialized");
    }

    // Force refresh all badges
    const result = await checkAndAwardBadges(user.id, true);

    console.log(`[Badge Refresh] User ${user.id}: ${result.awardedBadges.length} new badges, ${result.alreadyEarned} already earned, ${result.notEligible} not eligible, ${result.totalChecked} total checked`);

    // Get badge names for awarded badges
    const awardedBadgeNames = result.awardedBadges.length > 0
      ? await prisma.badge.findMany({
          where: { id: { in: result.awardedBadges } },
          select: { name: true },
        })
      : [];

    return NextResponse.json({
      success: true,
      message: `Badge calculation complete. ${result.awardedBadges.length} new badge(s) awarded!`,
      data: {
        ...result,
        awardedBadgeNames: awardedBadgeNames.map((b) => b.name),
      },
    });
  } catch (error) {
    console.error("Error refreshing badges:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to refresh badges" },
      { status: 500 }
    );
  }
}

