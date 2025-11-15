/**
 * Group Score Calculator
 * Calculates group scores based on:
 * - Number of courses started
 * - Average course completion percentage
 * - Number of projects started
 * - Number of projects completed (after evaluation)
 * - Sum of AI evaluation scores
 */

import { prisma } from "../lib/prisma";

// Weight configuration for group score calculation
// These can be adjusted as needed
export const GROUP_SCORE_WEIGHTS = {
  coursesStarted: 5, // Per course started (50 × 0.1)
  courseCompletion: 2, // Per percentage point of average completion (kept same)
  projectsStarted: 3, // Per project started (30 × 0.1)
  projectsCompleted: 8, // Per project completed (changed from 100 to 8)
  aiEvaluationScore: 0.1, // Per point of AI evaluation score (1 × 0.1)
} as const;

// Bonus awarded when all projects in a batch (module) are completed
const BATCH_COMPLETION_BONUS = 5; // (50 × 0.1)

/**
 * Calculate group score for a user in a specific group
 */
export async function calculateGroupScore(
  userId: string,
  groupId: string
): Promise<{
  coursesStarted: number;
  averageCourseCompletion: number;
  projectsStarted: number;
  projectsCompleted: number;
  totalAiEvaluationScore: number;
  finalScore: number;
}> {
  // Get all courses in this group that belong to this user
  // Also consider courses assigned to sectors (if this is a sector/group)
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { groupId, userId },
        { sectorId: groupId, userId }, // If groupId is actually a sector
      ],
      isDeleted: false,
    },
    include: {
      batch: {
        include: {
          projects: {
            select: {
              id: true,
              status: true,
              aiEvaluationScore: true,
              evaluatedAt: true,
            },
          },
        },
      },
    },
  });

  // Calculate metrics
  let coursesStarted = 0;
  let totalCourseCompletion = 0;
  let validCoursesForCompletion = 0;
  let projectsStarted = 0;
  let projectsCompleted = 0;
  let totalAiEvaluationScore = 0;
  let completedBatchCount = 0;

  for (const course of courses) {
    // Count courses started (status is not "not started")
    if (course.status !== "not started") {
      coursesStarted++;

      // Calculate course completion percentage
      const totalProjects = course.batch.reduce(
        (sum, batch) => sum + batch.projects.length,
        0
      );

      if (totalProjects > 0) {
        const completedProjects = course.batch.reduce(
          (sum, batch) =>
            sum +
            batch.projects.filter((p) => p.status === "completed").length,
          0
        );

        const completionPercentage =
          (completedProjects / totalProjects) * 100;
        totalCourseCompletion += completionPercentage;
        validCoursesForCompletion++;
      }
    }

    // Count projects
    for (const batch of course.batch) {
      // If batch has at least one project and all are completed, count bonus
      if (
        batch.projects.length > 0 &&
        batch.projects.every((p) => p.status === "completed")
      ) {
        completedBatchCount++;
      }

      for (const project of batch.projects) {
        // Count projects started
        if (project.status !== "not started") {
          projectsStarted++;

          // Count projects completed and sum AI scores
          if (project.status === "completed") {
            projectsCompleted++;
            if (project.aiEvaluationScore !== null) {
              totalAiEvaluationScore += project.aiEvaluationScore;
            }
          }
        }
      }
    }
  }

  // Calculate average course completion
  const averageCourseCompletion =
    validCoursesForCompletion > 0
      ? totalCourseCompletion / validCoursesForCompletion
      : 0;

  // Calculate weighted final score
  const finalScoreBase =
    coursesStarted * GROUP_SCORE_WEIGHTS.coursesStarted +
      averageCourseCompletion * GROUP_SCORE_WEIGHTS.courseCompletion +
      projectsStarted * GROUP_SCORE_WEIGHTS.projectsStarted +
      projectsCompleted * GROUP_SCORE_WEIGHTS.projectsCompleted +
      totalAiEvaluationScore * GROUP_SCORE_WEIGHTS.aiEvaluationScore;

  // Apply module (batch) completion bonus
  const finalScore = Math.round(finalScoreBase + completedBatchCount * BATCH_COMPLETION_BONUS);

  return {
    coursesStarted,
    averageCourseCompletion: Math.round(averageCourseCompletion * 100) / 100, // Round to 2 decimal places
    projectsStarted,
    projectsCompleted,
    totalAiEvaluationScore: Math.round(totalAiEvaluationScore * 100) / 100, // Round to 2 decimal places
    finalScore,
  };
}

/**
 * Update or create GroupScore for a user in a group
 */
export async function updateGroupScore(
  userId: string,
  groupId: string
): Promise<void> {
  const calculatedScore = await calculateGroupScore(userId, groupId);

  // Update or create GroupScore
  await prisma.groupScore.upsert({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
    create: {
      userId,
      groupId,
      ...calculatedScore,
      lastUpdatedDate: new Date(),
    },
    update: {
      ...calculatedScore,
      lastUpdatedDate: new Date(),
    },
  });

  // FIXED: Update ranks after score change
  await updateGroupRanks(groupId);
}

/**
 * Recalculate group scores for all users in a group
 */
export async function recalculateGroupScores(groupId: string): Promise<void> {
  // Get all active members
  const memberships = await prisma.groupMembership.findMany({
    where: {
      groupId,
      leftAt: null,
    },
    select: {
      userId: true,
    },
  });

  // Update scores for all members
  await Promise.all(
    memberships.map((membership) =>
      updateGroupScore(membership.userId, groupId)
    )
  );

  // Update ranks
  await updateGroupRanks(groupId);
}

/**
 * Update ranks for all users in a group
 */
export async function updateGroupRanks(groupId: string): Promise<void> {
  const scores = await prisma.groupScore.findMany({
    where: {
      groupId,
      user: {
        groupMemberships: {
          some: {
            groupId,
            leftAt: null,
          },
        },
      },
    },
    orderBy: [
      { finalScore: "desc" },
      { lastUpdatedDate: "desc" },
      { id: "asc" },
    ],
    select: {
      id: true,
    },
  });

  await Promise.all(
    scores.map((score, index) =>
      prisma.groupScore.update({
        where: { id: score.id },
        data: { rank: index + 1 },
      })
    )
  );
}

