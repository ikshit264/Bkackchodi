/**
 * Challenge Service
 * Handles challenge management, progress tracking, and completion detection
 */

import getPrismaClient from "./prisma";
import {
  ChallengeType,
  ChallengeStatus,
  ChallengeParticipantStatus,
} from "@prisma/client";

const prisma = getPrismaClient();

export interface ChallengeCriteria {
  projectsCompleted?: number;
  coursesCompleted?: number;
  badgesEarned?: number;
  days?: number; // For time-limited challenges
  streakDays?: number; // For streak challenges
  commits?: number;
  pullRequests?: number;
  [key: string]: any; // Allow flexible criteria
}

export interface ChallengeProgress {
  projectsCompleted?: number;
  coursesCompleted?: number;
  badgesEarned?: number;
  daysRemaining?: number;
  streakDays?: number;
  commits?: number;
  pullRequests?: number;
  [key: string]: any;
}

/**
 * Check if a challenge is completed based on criteria
 */
export async function checkChallengeCompletion(
  challengeId: string,
  userId: string
): Promise<boolean> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge || challenge.status !== "ACTIVE") {
    return false;
  }

  const participant = await prisma.challengeParticipant.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
  });

  if (!participant || participant.status === "COMPLETED") {
    return participant?.status === "COMPLETED";
  }

  const criteria = challenge.criteria as ChallengeCriteria;
  const progress = participant.progress as ChallengeProgress;

  // Check each criterion
  let allMet = true;

  if (criteria.projectsCompleted !== undefined) {
    if ((progress.projectsCompleted || 0) < criteria.projectsCompleted) {
      allMet = false;
    }
  }

  if (criteria.coursesCompleted !== undefined) {
    if ((progress.coursesCompleted || 0) < criteria.coursesCompleted) {
      allMet = false;
    }
  }

  if (criteria.badgesEarned !== undefined) {
    if ((progress.badgesEarned || 0) < criteria.badgesEarned) {
      allMet = false;
    }
  }

  if (criteria.streakDays !== undefined) {
    if ((progress.streakDays || 0) < criteria.streakDays) {
      allMet = false;
    }
  }

  if (criteria.commits !== undefined) {
    if ((progress.commits || 0) < criteria.commits) {
      allMet = false;
    }
  }

  if (criteria.pullRequests !== undefined) {
    if ((progress.pullRequests || 0) < criteria.pullRequests) {
      allMet = false;
    }
  }

  // Check time limit if applicable
  if (challenge.type === "TIME_LIMITED" && challenge.endDate) {
    const now = new Date();
    if (now > challenge.endDate) {
      // Challenge expired
      await prisma.challengeParticipant.update({
        where: {
          challengeId_userId: {
            challengeId,
            userId,
          },
        },
        data: {
          status: "FAILED",
        },
      });
      return false;
    }
  }

  return allMet;
}

/**
 * Update challenge progress for a user
 */
export async function updateChallengeProgress(
  challengeId: string,
  userId: string,
  updates: Partial<ChallengeProgress>
): Promise<void> {
  const participant = await prisma.challengeParticipant.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new Error("User is not a participant in this challenge");
  }

  const currentProgress = (participant.progress || {}) as ChallengeProgress;
  const newProgress = { ...currentProgress, ...updates };

  // Update progress
  await prisma.challengeParticipant.update({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
    data: {
      progress: newProgress,
      status: participant.status === "JOINED" ? "IN_PROGRESS" : participant.status,
    },
  });

  // Check if challenge is completed
  const isCompleted = await checkChallengeCompletion(challengeId, userId);
  if (isCompleted) {
    await prisma.challengeParticipant.update({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Award rewards if any
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (challenge?.rewards) {
      const rewards = challenge.rewards as any;
      // TODO: Implement reward distribution (badges, points, etc.)
      if (rewards.badgeId) {
        try {
          const { awardBadge } = await import("./BadgeService");
          await awardBadge(userId, rewards.badgeId);
        } catch (error) {
          console.error("Error awarding challenge badge:", error);
        }
      }
    }
  }
}

/**
 * Get challenge leaderboard
 */
export async function getChallengeLeaderboard(challengeId: string) {
  const participants = await prisma.challengeParticipant.findMany({
    where: {
      challengeId,
      // Include all participants except those who LEFT
      status: {
        not: "LEFT",
      },
    },
    include: {
      user: {
        select: {
          id: true,
          userName: true,
          name: true,
          lastName: true,
          avatar: true,
        },
      },
    },
    orderBy: [
      { points: "desc" }, // Primary sort by points (highest first)
      { status: "asc" }, // Completed first
      { completedAt: "asc" }, // Earlier completion = better
      { joinedAt: "asc" }, // Earlier join = better
    ],
  });

  // Separate active participants from failed ones
  const activeParticipants = participants.filter(
    (p) => p.status !== "FAILED"
  );
  const failedParticipants = participants.filter(
    (p) => p.status === "FAILED"
  );

  // Rank only active participants
  let currentRank = 1;
  const leaderboard: Array<{
    rank: number | null;
    userId: string;
    userName: string;
    name: string;
    avatar: string | null;
    points: number;
    progress: any;
    status: string;
    completedAt: Date | null;
    joinedAt: Date;
  }> = [];

  // Add ranked active participants
  activeParticipants.forEach((p, index) => {
    // Calculate rank: if points are the same as previous participant, use same rank
    let rank: number | null = null;
    if (index === 0) {
      rank = 1;
      currentRank = 1;
    } else {
      const prevPoints = activeParticipants[index - 1].points;
      if (p.points === prevPoints) {
        // Same rank as previous participant (tie)
        rank = currentRank;
      } else {
        // Next rank (index + 1, but accounting for ties)
        currentRank = index + 1;
        rank = currentRank;
      }
    }

    leaderboard.push({
      rank: rank, // Always use calculated rank to ensure accuracy
      userId: p.userId,
      userName: p.user.userName,
      name: `${p.user.name} ${p.user.lastName}`.trim(),
      avatar: p.user.avatar,
      points: p.points,
      progress: p.progress,
      status: p.status,
      completedAt: p.completedAt,
      joinedAt: p.joinedAt,
    });
  });

  // Add failed participants at the end without ranks
  failedParticipants.forEach((p) => {
    leaderboard.push({
      rank: null, // Failed participants don't get ranks
      userId: p.userId,
      userName: p.user.userName,
      name: `${p.user.name} ${p.user.lastName}`.trim(),
      avatar: p.user.avatar,
      points: p.points,
      progress: p.progress,
      status: p.status,
      completedAt: p.completedAt,
      joinedAt: p.joinedAt,
    });
  });

  return leaderboard;
}

/**
 * Auto-update challenge progress based on user activity
 * This should be called when relevant events occur (project completion, etc.)
 */
export async function autoUpdateChallengeProgress(
  userId: string,
  eventType: "PROJECT_COMPLETED" | "COURSE_COMPLETED" | "BADGE_EARNED" | "STREAK_UPDATED"
): Promise<void> {
  // Get prisma client (use function call to ensure it's initialized when dynamically imported)
  const db = getPrismaClient();
  
  // Get all active challenges the user is participating in
  const activeChallenges = await db.challengeParticipant.findMany({
    where: {
      userId,
      status: {
        in: ["JOINED", "IN_PROGRESS"],
      },
      challenge: {
        status: "ACTIVE",
      },
    },
    include: {
      challenge: true,
    },
  });

  for (const participant of activeChallenges) {
    if (!participant.challenge) continue;

    const progress = (participant.progress || {}) as ChallengeProgress;
    const criteria = participant.challenge.criteria as ChallengeCriteria;

    let shouldUpdate = false;
    const updates: Partial<ChallengeProgress> = {};

    // Update based on event type
    if (eventType === "PROJECT_COMPLETED" && criteria.projectsCompleted !== undefined) {
      updates.projectsCompleted = (progress.projectsCompleted || 0) + 1;
      shouldUpdate = true;
    }

    if (eventType === "COURSE_COMPLETED" && criteria.coursesCompleted !== undefined) {
      updates.coursesCompleted = (progress.coursesCompleted || 0) + 1;
      shouldUpdate = true;
    }

    if (eventType === "BADGE_EARNED" && criteria.badgesEarned !== undefined) {
      updates.badgesEarned = (progress.badgesEarned || 0) + 1;
      shouldUpdate = true;
    }

    if (eventType === "STREAK_UPDATED" && criteria.streakDays !== undefined) {
      // Get user's current streak from Score
      const userScore = await db.score.findUnique({
        where: { userId },
        select: { currentStreak: true },
      });
      if (userScore) {
        updates.streakDays = userScore.currentStreak;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      await updateChallengeProgress(participant.challengeId, userId, updates);
      
      // Recalculate points if challenge has attached course/project
      if (participant.challenge.courseId || participant.challenge.projectId) {
        try {
          const { calculateChallengePoints, updateChallengeRankings } = await import("./EnhancedChallengeService");
          const points = await calculateChallengePoints(userId, participant.challengeId);
          await prisma.challengeParticipant.update({
            where: {
              challengeId_userId: {
                challengeId: participant.challengeId,
                userId,
              },
            },
            data: { points },
          });
          // Update all rankings for this challenge
          await updateChallengeRankings(participant.challengeId);
        } catch (error) {
          console.error("Error recalculating challenge points:", error);
        }
      }
    }
  }
}

