/**
 * Badge Service
 * Handles badge checking, awarding, and progress tracking
 */

import { prisma } from "./prisma";
import { BadgeCategory, BadgeRarity } from "@prisma/client";

export interface BadgeCriteria {
  projectsCompleted?: number;
  projectsStarted?: number;
  streakDays?: number;
  commits?: number;
  pullRequests?: number;
  reviews?: number;
  issues?: number;
  groupRank?: number;
  globalRank?: number;
  coursesCompleted?: number;
  perfectScore?: boolean;
  [key: string]: any;
}

export interface BadgeCheckResult {
  eligible: boolean;
  progress?: number;
  maxProgress?: number;
}

/**
 * Check if user meets criteria for a badge
 */
export async function checkBadgeEligibility(
  userId: string,
  badgeId: string
): Promise<BadgeCheckResult> {
  const badge = await prisma.badge.findUnique({
    where: { id: badgeId },
  });

  if (!badge) {
    console.log(`[Badge Debug] Badge ${badgeId} not found`);
    return { eligible: false };
  }

  const criteria = badge.criteria as BadgeCriteria;
  const userBadge = await prisma.userBadge.findUnique({
    where: {
      userId_badgeId: {
        userId,
        badgeId,
      },
    },
  });

  // If already earned, return not eligible
  if (userBadge) {
    return { eligible: false };
  }

  // Get user data for checking
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      score: true,
      courses: {
        where: { isDeleted: false }, // Only count non-deleted courses
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          batch: {
            include: {
              projects: true,
            },
          },
        },
      },
      groupScores: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!user) {
    console.log(`[Badge Debug] User ${userId} not found`);
    return { eligible: false };
  }

  if (!user.score) {
    console.log(`[Badge Debug] User ${userId} has no Score record`);
    return { eligible: false };
  }

  // Calculate user metrics FIRST (before using them)
  const completedProjects = user.courses.reduce(
    (sum, course) =>
      sum +
      course.batch.reduce(
        (batchSum, batch) =>
          batchSum +
          batch.projects.filter((p) => p.status === "completed").length,
        0
      ),
    0
  );

  const startedProjects = user.courses.reduce(
    (sum, course) =>
      sum +
      course.batch.reduce(
        (batchSum, batch) =>
          batchSum +
          batch.projects.filter((p) => p.status !== "not started").length,
        0
      ),
    0
  );

  const completedCourses = user.courses.filter(
    (c) => c.status === "completed"
  ).length;

  const startedCourses = user.courses.filter(
    (c) => c.status !== "not started"
  ).length;

  const allProjects = user.courses.flatMap((c) =>
    c.batch.flatMap((b) => b.projects)
  );
  const perfectProjects = allProjects.filter(
    (p) => p.aiEvaluationScore === 100
  );

  // Calculate login days (days since account creation)
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // User metrics map for flexible criteria evaluation
  const userMetrics: Record<string, number | boolean> = {
    streak: user.score.currentStreak,
    streakDays: user.score.currentStreak, // Alias for backward compatibility
    longestStreak: user.score.longestStreak,
    totalActiveDays: user.score.totalActiveDays,
    commits: user.score.commits,
    pullRequests: user.score.pullRequests,
    reviews: user.score.review,
    issues: user.score.issue,
    projectsCompleted: completedProjects, // Fixed: use the calculated variable
    projectsStarted: startedProjects, // Fixed: use the calculated variable
    coursesCompleted: completedCourses, // Fixed: use the calculated variable
    coursesStarted: startedCourses, // Fixed: use the calculated variable
    globalRank: user.score.rank || 999999,
    perfectScore: perfectProjects.length > 0,
    loginDays: daysSinceCreation,
    consecutiveLoginDays: user.score.currentStreak, // Using streak as proxy for consecutive logins
  };

  // Check group ranks
  const topGroupRanks = user.groupScores
    .filter((gs) => gs.rank !== null)
    .map((gs) => gs.rank!);
  const bestGroupRank = topGroupRanks.length > 0 ? Math.min(...topGroupRanks) : 999999;
  userMetrics.groupRank = bestGroupRank;

  // Flexible criteria evaluation - check all criteria keys
  let eligible = true;
  let progress = 0;
  let maxProgress = 0;

  // Find the primary metric (the one with the highest threshold)
  let primaryMetric: string | null = null;
  let primaryThreshold = 0;

  for (const [key, threshold] of Object.entries(criteria)) {
    if (typeof threshold === "number" && threshold > primaryThreshold && threshold !== -1) {
      primaryMetric = key;
      primaryThreshold = threshold;
    }
  }

  // Evaluate all criteria (AND logic)
  for (const [key, threshold] of Object.entries(criteria)) {
    if (key === "perfectScore") {
      // Boolean criteria
      if (threshold === true && !userMetrics.perfectScore) {
        eligible = false;
      }
    } else if (typeof threshold === "number") {
      // Special case: -1 means always eligible (for welcome badge)
      if (threshold === -1) {
        eligible = true;
        maxProgress = 1;
        progress = 1;
        break; // No need to check other criteria
      }

      const userValue = userMetrics[key];
      
      // Debug logging for GitHub badges
      if (key === "commits" || key === "pullRequests" || key === "reviews" || key === "issues") {
        console.log(`[Badge Debug] ${badge.name}: ${key} = ${userValue}, threshold = ${threshold}, eligible = ${userValue !== undefined && userValue !== null && typeof userValue === "number" && userValue >= threshold}`);
      }

      if (userValue === undefined || userValue === null) {
        // Metric doesn't exist for this user, not eligible
        eligible = false;
      } else if (typeof userValue === "number") {
        if (userValue < threshold) {
          eligible = false;
        } else {
          // Track progress for primary metric
          if (key === primaryMetric) {
            maxProgress = threshold;
            progress = Math.min(userValue, threshold);
          }
        }
      } else if (typeof userValue === "boolean") {
        // Boolean metrics are handled separately (like perfectScore)
        // This shouldn't reach here for numeric thresholds
      }
    }
  }

  // If no primary metric found, use first numeric criteria
  if (!primaryMetric && maxProgress === 0) {
    for (const [key, threshold] of Object.entries(criteria)) {
      if (typeof threshold === "number" && threshold !== -1) {
        primaryMetric = key;
        maxProgress = threshold;
        const userValue = userMetrics[key] as number;
        progress = Math.min(userValue || 0, threshold);
        break;
      }
    }
  }

  return {
    eligible,
    progress: Math.min(progress, maxProgress),
    maxProgress,
  };
}

/**
 * Award a badge to a user
 */
export async function awardBadge(
  userId: string,
  badgeId: string
): Promise<boolean> {
  try {
    // Check if already awarded
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId,
        },
      },
    });

    if (existing) {
      return false; // Already awarded
    }

    // Check eligibility
    const checkResult = await checkBadgeEligibility(userId, badgeId);
    if (!checkResult.eligible) {
      return false; // Not eligible
    }

    // Award badge
    await prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        progress: checkResult.progress || 0,
      },
    });

    // Create notification
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (badge) {
      await prisma.notification.create({
        data: {
          recipientUserId: userId,
          type: "BADGE_EARNED",
          data: {
            badgeId: badge.id,
            badgeName: badge.name,
            badgeIcon: badge.icon,
            badgeRarity: badge.rarity,
          },
        },
      });
      
      // Phase 2: Track badge earned contribution
      try {
        const { trackContribution } = await import("./ContributionService");
        await trackContribution(
          userId,
          "BADGE_EARNED",
          { badgeId: badge.id, badgeName: badge.name }
        );
      } catch (error) {
        console.error("Error tracking badge contribution:", error);
      }
    }

    return true;
  } catch (error) {
    console.error("Error awarding badge:", error);
    return false;
  }
}

/**
 * Check and award all eligible badges for a user
 * This function is called automatically and can be triggered manually via refresh button
 */
export async function checkAndAwardBadges(userId: string, forceRefresh: boolean = false): Promise<{
  awardedBadges: string[];
  totalChecked: number;
  alreadyEarned: number;
  notEligible: number;
  details?: Array<{ badgeName: string; eligible: boolean; reason?: string }>;
}> {
  // Get all active badges (including from templates)
  const allBadges = await prisma.badge.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`[Badge Check] Checking ${allBadges.length} badges for user ${userId}`);

  const awardedBadges: string[] = [];
  let alreadyEarned = 0;
  let notEligible = 0;
  const details: Array<{ badgeName: string; eligible: boolean; reason?: string }> = [];

  for (const badge of allBadges) {
    // Check if already earned
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id,
        },
      },
    });

    if (existing) {
      alreadyEarned++;
      details.push({ badgeName: badge.name, eligible: false, reason: "Already earned" });
      continue;
    }

    // Check eligibility
    const checkResult = await checkBadgeEligibility(userId, badge.id);
    if (checkResult.eligible) {
      const awarded = await awardBadge(userId, badge.id);
      if (awarded) {
        awardedBadges.push(badge.id);
        details.push({ badgeName: badge.name, eligible: true, reason: "Awarded" });
        console.log(`[Badge Awarded] ${badge.name} to user ${userId}`);
      } else {
        details.push({ badgeName: badge.name, eligible: false, reason: "Failed to award" });
      }
    } else {
      notEligible++;
      details.push({ badgeName: badge.name, eligible: false, reason: "Not eligible" });
    }
  }

  return {
    awardedBadges,
    totalChecked: allBadges.length,
    alreadyEarned,
    notEligible,
    details: forceRefresh ? details : undefined,
  };
}

/**
 * Get user's badges with progress
 */
export async function getUserBadges(userId: string) {
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: {
      badge: true,
    },
    orderBy: {
      earnedAt: "desc",
    },
  });

  return userBadges;
}

/**
 * Get available badges for user (not yet earned)
 */
export async function getAvailableBadges(userId: string) {
  const allBadges = await prisma.badge.findMany({
    orderBy: [
      { rarity: "asc" },
      { category: "asc" },
      { name: "asc" },
    ],
  });

  const userBadgeIds = (
    await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    })
  ).map((ub) => ub.badgeId);

  const availableBadges = await Promise.all(
    allBadges
      .filter((badge) => !userBadgeIds.includes(badge.id))
      .map(async (badge) => {
        const checkResult = await checkBadgeEligibility(userId, badge.id);
        return {
          ...badge,
          progress: checkResult.progress || 0,
          maxProgress: checkResult.maxProgress || 0,
        };
      })
  );

  return availableBadges;
}

/**
 * Initialize default badges (LeetCode-style milestone badges)
 */
export async function initializeDefaultBadges() {
  const defaultBadges = [
    // Welcome badge (always eligible - awarded on account creation)
    {
      name: "Welcome!",
      description: "Join the platform and start your learning journey",
      icon: "👋",
      category: BadgeCategory.MILESTONE,
      rarity: BadgeRarity.COMMON,
      criteria: { loginDays: -1 }, // Special: -1 means always eligible
    },
    // Project badges (LeetCode-style milestones)
    {
      name: "First Steps",
      description: "Complete your first project",
      icon: "🎯",
      category: BadgeCategory.PROJECTS,
      rarity: BadgeRarity.COMMON,
      criteria: { projectsCompleted: 1 },
    },
    {
      name: "10 Projects",
      description: "Complete 10 projects",
      icon: "🔥",
      category: BadgeCategory.PROJECTS,
      rarity: BadgeRarity.COMMON,
      criteria: { projectsCompleted: 10 },
    },
    {
      name: "50 Projects",
      description: "Complete 50 projects",
      icon: "⭐",
      category: BadgeCategory.PROJECTS,
      rarity: BadgeRarity.RARE,
      criteria: { projectsCompleted: 50 },
    },
    {
      name: "100 Projects",
      description: "Complete 100 projects",
      icon: "💎",
      category: BadgeCategory.PROJECTS,
      rarity: BadgeRarity.EPIC,
      criteria: { projectsCompleted: 100 },
    },
    {
      name: "200 Projects",
      description: "Complete 200 projects",
      icon: "👑",
      category: BadgeCategory.PROJECTS,
      rarity: BadgeRarity.LEGENDARY,
      criteria: { projectsCompleted: 200 },
    },
    // Streak badges (LeetCode-style: 7, 30, 100, 200, 365 days)
    {
      name: "7 Day Streak",
      description: "Maintain a 7-day streak",
      icon: "🔥",
      category: BadgeCategory.STREAKS,
      rarity: BadgeRarity.COMMON,
      criteria: { streak: 7 },
    },
    {
      name: "30 Day Streak",
      description: "Maintain a 30-day streak",
      icon: "💪",
      category: BadgeCategory.STREAKS,
      rarity: BadgeRarity.RARE,
      criteria: { streak: 30 },
    },
    {
      name: "100 Day Streak",
      description: "Maintain a 100-day streak",
      icon: "🏆",
      category: BadgeCategory.STREAKS,
      rarity: BadgeRarity.EPIC,
      criteria: { streak: 100 },
    },
    {
      name: "200 Day Streak",
      description: "Maintain a 200-day streak",
      icon: "🌟",
      category: BadgeCategory.STREAKS,
      rarity: BadgeRarity.EPIC,
      criteria: { streak: 200 },
    },
    {
      name: "365 Day Streak",
      description: "Maintain a 365-day streak (1 year!)",
      icon: "👑",
      category: BadgeCategory.STREAKS,
      rarity: BadgeRarity.LEGENDARY,
      criteria: { streak: 365 },
    },
    // GitHub badges (LeetCode-style milestones)
    {
      name: "100 Commits",
      description: "Make 100 commits",
      icon: "💻",
      category: BadgeCategory.GITHUB,
      rarity: BadgeRarity.COMMON,
      criteria: { commits: 100 },
    },
    {
      name: "500 Commits",
      description: "Make 500 commits",
      icon: "🚀",
      category: BadgeCategory.GITHUB,
      rarity: BadgeRarity.RARE,
      criteria: { commits: 500 },
    },
    {
      name: "1000 Commits",
      description: "Make 1000 commits",
      icon: "⭐",
      category: BadgeCategory.GITHUB,
      rarity: BadgeRarity.EPIC,
      criteria: { commits: 1000 },
    },
    {
      name: "50 Pull Requests",
      description: "Create 50 pull requests",
      icon: "🔀",
      category: BadgeCategory.GITHUB,
      rarity: BadgeRarity.RARE,
      criteria: { pullRequests: 50 },
    },
    {
      name: "100 Pull Requests",
      description: "Create 100 pull requests",
      icon: "🎯",
      category: BadgeCategory.GITHUB,
      rarity: BadgeRarity.EPIC,
      criteria: { pullRequests: 100 },
    },
    {
      name: "Code Reviewer",
      description: "Review 50 pull requests",
      icon: "👀",
      category: BadgeCategory.GITHUB,
      rarity: BadgeRarity.RARE,
      criteria: { reviews: 50 },
    },
    // Group badges
    {
      name: "Group Champion",
      description: "Rank in top 10 of any group",
      icon: "🥇",
      category: BadgeCategory.GROUP,
      rarity: BadgeRarity.EPIC,
      criteria: { groupRank: 10 },
    },
    // Course badges
    {
      name: "Course Completer",
      description: "Complete 5 courses",
      icon: "📚",
      category: BadgeCategory.COURSE,
      rarity: BadgeRarity.RARE,
      criteria: { coursesCompleted: 5 },
    },
    // Milestone badges
    {
      name: "Top 100",
      description: "Rank in top 100 globally",
      icon: "🌟",
      category: BadgeCategory.MILESTONE,
      rarity: BadgeRarity.EPIC,
      criteria: { globalRank: 100 },
    },
    {
      name: "Top 10",
      description: "Rank in top 10 globally",
      icon: "👑",
      category: BadgeCategory.MILESTONE,
      rarity: BadgeRarity.LEGENDARY,
      criteria: { globalRank: 10 },
    },
    {
      name: "Perfect Score",
      description: "Achieve a perfect score on a project",
      icon: "💯",
      category: BadgeCategory.MILESTONE,
      rarity: BadgeRarity.RARE,
      criteria: { perfectScore: true },
    },
  ];

  for (const badgeData of defaultBadges) {
    await prisma.badge.upsert({
      where: { name: badgeData.name },
      update: {},
      create: badgeData,
    });
  }

  return defaultBadges.length;
}

