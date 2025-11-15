/**
 * Global Score Calculator
 * Calculates global score as weighted combination of:
 * - GitHub Score (from GitHub API)
 * - Sum of all Group Scores
 */

import { prisma } from "../lib/prisma";

// Weight configuration for global score calculation
export const GLOBAL_SCORE_WEIGHTS = {
  githubScore: 0.4, // 40% weight for GitHub score
  groupScores: 0.6, // 60% weight for sum of group scores
} as const;

/**
 * Calculate GitHub score from Score model fields
 * (This is the existing calculation from BackendHelpers.ts)
 */
function calculateGitHubScore(score: {
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
}): number {
  // GitHub score uses GitHub-only streaks (for analytics)
  // Note: currentStreak and longestStreak in Score model are now unified (GitHub + App)
  // But for GitHub score calculation, we should ideally use GitHub-only streaks
  // For now, using unified streaks (which is fine since GitHub has higher weight)
  return Math.round(
    2 * score.commits +
      4 * score.pullRequests +
      3 * score.issues +
      1.5 * score.reviews +
      2 * score.currentStreak +
      1.5 * score.longestStreak
  );
}

/**
 * Calculate global final score for a user
 * Global Score = weighted(GitHub Score + Sum of Group Scores)
 */
export async function calculateGlobalScore(userId: string): Promise<{
  githubScore: number;
  sumOfGroupScores: number;
  finalScore: number;
}> {
  // Get user's GitHub-based score
  const score = await prisma.score.findUnique({
    where: { userId },
  });

  if (!score) {
    return {
      githubScore: 0,
      sumOfGroupScores: 0,
      finalScore: 0,
    };
  }

  // Calculate GitHub score
  const githubScore = calculateGitHubScore({
    commits: score.commits,
    pullRequests: score.pullRequests,
    issues: score.issue,
    reviews: score.review,
    totalActiveDays: score.totalActiveDays,
    currentStreak: score.currentStreak,
    longestStreak: score.longestStreak,
  });

  // Get sum of all group scores for this user
  const groupScores = await prisma.groupScore.findMany({
    where: {
      userId,
      user: {
        groupMemberships: {
          some: {
            userId,
            leftAt: null, // Only active memberships
          },
        },
      },
    },
    select: {
      finalScore: true,
    },
  });

  const sumOfGroupScores = groupScores.reduce(
    (sum, gs) => sum + gs.finalScore,
    0
  );

  // Calculate weighted final score
  const finalScore = Math.round(
    githubScore * GLOBAL_SCORE_WEIGHTS.githubScore +
      sumOfGroupScores * GLOBAL_SCORE_WEIGHTS.groupScores
  );

  return {
    githubScore,
    sumOfGroupScores,
    finalScore,
  };
}

/**
 * Update global score for a user
 */
export async function updateGlobalScore(
  userId: string,
  force = false
): Promise<void> {
  // Respect lastUpdatedDate unless force is true
  if (!force) {
    const existing = await prisma.score.findUnique({
      where: { userId },
      select: { lastUpdatedDate: true },
    });

    if (existing?.lastUpdatedDate) {
      const msSince = Date.now() - new Date(existing.lastUpdatedDate).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (msSince < oneDayMs) {
        return; // Skip recalculation within 24h when not forced
      }
    }
  }

  const calculated = await calculateGlobalScore(userId);

  // Update Score model
  await prisma.score.update({
    where: { userId },
    data: {
      githubScore: calculated.githubScore,
      finalScore: calculated.finalScore,
      lastUpdatedDate: new Date(),
    },
  });

  // Phase 1: Check and award badges after score update
  try {
    const { checkAndAwardBadges } = await import("./BadgeService");
    await checkAndAwardBadges(userId);
  } catch (error) {
    console.error("Error checking badges after score update:", error);
    // Don't fail the score update if badge check fails
  }
  
  // Phase 2: Update challenge progress for streak updates
  try {
    const { autoUpdateChallengeProgress } = await import("./ChallengeService");
    await autoUpdateChallengeProgress(userId, "STREAK_UPDATED");
  } catch (error) {
    console.error("Error updating challenge progress for streak:", error);
  }
}


