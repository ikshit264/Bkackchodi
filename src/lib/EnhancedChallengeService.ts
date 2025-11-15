/**
 * Enhanced Challenge Service
 * Handles all challenge operations including course/project cloning, invitations, access control, and analytics
 */

import { prisma } from "./prisma";
import { cloneCourse, findClonedCourse, ensureSyncCopyAccess, downgradeSyncCopyToCopy } from "./SharingService";

export interface ChallengeCriteria {
  projectsCompleted?: number;
  coursesCompleted?: number;
  badgesEarned?: number;
  days?: number;
  streakDays?: number;
  commits?: number;
  pullRequests?: number;
  pointsRequired?: number; // Points required to win
  [key: string]: unknown;
}

export interface ChallengeProgress {
  projectsCompleted?: number;
  coursesCompleted?: number;
  badgesEarned?: number;
  daysRemaining?: number;
  streakDays?: number;
  commits?: number;
  pullRequests?: number;
  points?: number; // Calculated points
  courseProgress?: number; // Percentage
  [key: string]: unknown;
}

/**
 * Check if user already has a course cloned from the same source (by source courseId)
 * Returns the cloned course ID if it exists, null otherwise
 * 
 * Uses SharingService.findClonedCourse which checks sourceCourseId
 */
export async function checkCourseExists(
  userId: string,
  sourceCourseId: string
): Promise<string | null> {
  // 1. Check if user already has a challenge participant record for a challenge using this source course
  const existingParticipant = await prisma.challengeParticipant.findFirst({
    where: {
      userId,
      challenge: {
        courseId: sourceCourseId,
      },
      challengeCourseId: {
        not: null,
      },
    },
    select: {
      challengeCourseId: true,
    },
  });

  if (existingParticipant && existingParticipant.challengeCourseId) {
    const clonedCourse = await prisma.course.findUnique({
      where: { id: existingParticipant.challengeCourseId },
      select: { id: true, isDeleted: true },
    });
    if (clonedCourse && !clonedCourse.isDeleted) {
      return existingParticipant.challengeCourseId;
    }
  }

  // 2. Check if user owns the source course itself
  const userCourse = await prisma.course.findFirst({
    where: {
      userId,
      id: sourceCourseId,
      isDeleted: false,
    },
  });

  if (userCourse) {
    return sourceCourseId;
  }

  // 3. Use SharingService to find cloned course (uses sourceCourseId)
  return await findClonedCourse(userId, sourceCourseId);
}

/**
 * Clone course for challenge
 * Uses SharingService.cloneCourse
 */
export async function cloneCourseForChallenge(
  userId: string,
  sourceCourseId: string
): Promise<string> {
  // Check if already cloned
  const existingCourseId = await checkCourseExists(userId, sourceCourseId);
  if (existingCourseId) {
    return existingCourseId;
  }

  // Use SharingService to clone course
  return await cloneCourse({
    userId,
    sourceCourseId,
    createGitHubRepos: true,
    retryOnFailure: true,
  });
}

/**
 * Create course from single project for challenge
 */
export async function createProjectCourseForChallenge(
  userId: string,
  projectId: string,
  challengeTitle: string
): Promise<string> {
  // Load source project
  const sourceProject = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      batch: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!sourceProject) {
    throw new Error("Source project not found");
  }

  // Get user's GitHub ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubId: true, clerkId: true },
  });

  const githubId = user?.githubId || null;
  const clerkId = user?.clerkId || null;

  // Create course with title "Challenge: {challengeTitle}"
  const courseTitle = `Challenge: ${challengeTitle}`;

  // Create course with one batch containing one project
  const newCourse = await prisma.course.create({
    data: {
      title: courseTitle,
      status: "not started",
      userId,
      batch: {
        create: {
          number: 1,
          status: "not started",
          projects: {
            create: {
              title: sourceProject.title,
              description: sourceProject.description,
              level: sourceProject.level,
              status: sourceProject.status,
              position: 1,
              learningObjectives: sourceProject.learningObjectives,
              steps: Array.isArray(sourceProject.steps)
                ? (sourceProject.steps as Array<Record<string, unknown>>).map((s: Record<string, unknown>) => ({
                    ...s,
                    issueId: null,
                    itemId: null,
                  }))
                : [],
            },
          },
        },
      },
    },
    include: {
      batch: {
        include: {
          projects: true,
        },
      },
    },
  });

  // Create GitHub project if user has GitHub linked
  if (githubId && clerkId) {
    try {
      const { CreateProject } = await import("../utils/github/GithubProjectBackchodi");
      const projectId = await CreateProject(
        githubId,
        clerkId,
        "user",
        `${courseTitle}-Batch-1`
      );
      if (projectId && typeof projectId === "string") {
        await prisma.batch.update({
          where: { id: newCourse.batch[0].id },
          data: { githubProjectId: projectId },
        });
      }
    } catch (err) {
      console.error("Failed to create GitHub project:", err);
    }
  }

  return newCourse.id;
}

/**
 * Calculate challenge points for a user
 * Points = sum of all project aiEvaluationScore values
 */
export async function calculateChallengePoints(
  userId: string,
  challengeId: string
): Promise<number> {
  const participant = await prisma.challengeParticipant.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
    include: {
      challenge: {
        include: {
          course: {
            include: {
              batch: {
                include: {
                  projects: true,
                },
              },
            },
          },
          project: true,
        },
      },
      challengeCourse: {
        include: {
          batch: {
            include: {
              projects: true,
            },
          },
        },
      },
    },
  });

  if (!participant) {
    return 0;
  }

  let totalPoints = 0;

  // If challenge has attached course
  if (participant.challenge.courseId && participant.challengeCourse) {
    // Sum all project evaluation scores from the cloned course
    for (const batch of participant.challengeCourse.batch) {
      for (const project of batch.projects) {
        if (project.aiEvaluationScore !== null && project.aiEvaluationScore !== undefined) {
          totalPoints += project.aiEvaluationScore;
        }
      }
    }
  }
  // If challenge has attached project (project-only)
  else if (participant.challenge.projectId && participant.challengeCourse) {
    // Get the project from the cloned course
    for (const batch of participant.challengeCourse.batch) {
      for (const project of batch.projects) {
        if (project.aiEvaluationScore !== null && project.aiEvaluationScore !== undefined) {
          totalPoints += project.aiEvaluationScore;
        }
      }
    }
  }

  return Math.round(totalPoints);
}

/**
 * Update challenge rankings for all participants
 */
export async function updateChallengeRankings(challengeId: string): Promise<void> {
  // Get only active participants (exclude FAILED and LEFT)
  const activeParticipants = await prisma.challengeParticipant.findMany({
    where: {
      challengeId,
      status: {
        in: ["JOINED", "IN_PROGRESS", "COMPLETED"],
      },
    },
    orderBy: [
      { points: "desc" },
      { completedAt: "asc" }, // Earlier completion = better rank
      { joinedAt: "asc" }, // Earlier join = better rank
    ],
  });

  // Update ranks with proper tie handling (only for active participants)
  let currentRank = 1;
  for (let i = 0; i < activeParticipants.length; i++) {
    // If this participant has the same points as the previous one, they get the same rank
    if (i > 0 && activeParticipants[i].points === activeParticipants[i - 1].points) {
      // Same rank as previous participant (tie)
      await prisma.challengeParticipant.update({
        where: { id: activeParticipants[i].id },
        data: { rank: currentRank },
      });
    } else {
      // New rank (next position)
      currentRank = i + 1;
      await prisma.challengeParticipant.update({
        where: { id: activeParticipants[i].id },
        data: { rank: currentRank },
      });
    }
  }

  // Set rank to null for failed participants
  await prisma.challengeParticipant.updateMany({
    where: {
      challengeId,
      status: "FAILED",
    },
    data: { rank: null },
  });
}

/**
 * Check if user can access challenge course/project
 */
export async function checkChallengeAccess(
  userId: string,
  challengeId: string
): Promise<{ canAccess: boolean; message?: string }> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    return { canAccess: false, message: "Challenge not found" };
  }

  // Check if user is a participant
  const participant = await prisma.challengeParticipant.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
  });

  if (!participant) {
    return { canAccess: false, message: "You are not a participant in this challenge" };
  }

  // Allow access to ACTIVE and COMPLETED challenges
  // Only block DRAFT challenges if startDate hasn't been reached
  if (challenge.status === "DRAFT") {
    const now = new Date();
    const startDate = challenge.startDate;

    if (!startDate || now < startDate) {
      const diffMs = startDate.getTime() - now.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return {
        canAccess: false,
        message: `Challenge "${challenge.name}" starts on ${startDate.toLocaleString()}. You are ${days} days, ${hours} hours, and ${minutes} minutes early to access it.`,
      };
    }
    // If startDate has passed but still DRAFT, allow access (will be auto-activated soon)
    return { canAccess: true };
  }

  // ACTIVE, COMPLETED, and other statuses allow access
  return { canAccess: true };
}

/**
 * Award badges to challenge winners (public challenges only)
 */
export async function awardChallengeBadges(challengeId: string): Promise<void> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge || !challenge.isPublic || !challenge.rewards) {
    return; // Only public challenges have badges
  }

  const rewards = challenge.rewards as Record<string, string>; // { "1": "badgeId", "2-4": "badgeId2", ... }

  // Get ranked participants
  const participants = await prisma.challengeParticipant.findMany({
    where: {
      challengeId,
      status: {
        in: ["COMPLETED", "IN_PROGRESS"],
      },
    },
    orderBy: [
      { rank: "asc" },
      { completedAt: "asc" },
    ],
    take: 100, // Top 100
  });

  const { awardBadge } = await import("./BadgeService");

  for (const participant of participants) {
    if (!participant.rank) continue;

    const rank = participant.rank;
    let badgeId: string | null = null;

    // Check for exact rank match
    if (rewards[rank.toString()]) {
      badgeId = rewards[rank.toString()];
    } else {
      // Check for range match (e.g., "2-4")
      for (const [key, value] of Object.entries(rewards)) {
        if (key.includes("-")) {
          const [min, max] = key.split("-").map(Number);
          if (rank >= min && rank <= max) {
            badgeId = value;
            break;
          }
        }
      }
    }

    if (badgeId) {
      try {
        await awardBadge(participant.userId, badgeId);
      } catch (error) {
        console.error(`Error awarding badge to user ${participant.userId}:`, error);
      }
    }
  }
}

/**
 * Auto-activate challenges when startDate arrives
 */
export async function autoActivateChallenges(): Promise<void> {
  const now = new Date();

  // Find challenges that should be activated
  const challengesToActivate = await prisma.challenge.findMany({
    where: {
      status: "DRAFT",
      startDate: {
        lte: now,
      },
    },
    select: { id: true },
  });

  // Activate challenges
  await prisma.challenge.updateMany({
    where: {
      status: "DRAFT",
      startDate: {
        lte: now,
      },
    },
    data: {
      status: "ACTIVE",
    },
  });

  // Automatically "join" all participants who were in JOINED status
  // This ensures they're ready to participate when challenges auto-activate
  for (const challenge of challengesToActivate) {
    try {
      await prisma.challengeParticipant.updateMany({
        where: {
          challengeId: challenge.id,
          status: "JOINED",
        },
        data: {
          status: "IN_PROGRESS", // Automatically move to IN_PROGRESS when challenge activates
        },
      });

      // Send notifications to participants
      try {
        const { createNotification } = await import("./NotificationHelper");
        const participants = await prisma.challengeParticipant.findMany({
          where: { challengeId: challenge.id },
          select: { userId: true },
        });

        const challengeData = await prisma.challenge.findUnique({
          where: { id: challenge.id },
          select: { name: true },
        });

        for (const participant of participants) {
          await createNotification(participant.userId, "CHALLENGE_ACTIVATED", {
            challengeId: challenge.id,
            challengeName: challengeData?.name || "Challenge",
          });
        }
      } catch (error) {
        console.error("Error sending activation notifications:", error);
      }
    } catch (error) {
      console.error(`Error updating participants for challenge ${challenge.id}:`, error);
    }
  }
}

/**
 * Auto-complete expired challenges and award badges
 */
export async function autoCompleteExpiredChallenges(): Promise<void> {
  const now = new Date();

  const expiredChallenges = await prisma.challenge.findMany({
    where: {
      status: {
        in: ["DRAFT", "ACTIVE"],
      },
      endDate: {
        lt: now,
      },
      isDeleted: false,
    },
  });

  for (const challenge of expiredChallenges) {
    // Update challenge status
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { status: "COMPLETED" },
    });

    // Note: We do NOT downgrade SYNC_COPY to COPY on completion
    // COMPLETED challenges still allow SYNC_COPY access (per requirements)
    // Only downgrade when: challenge deleted, user leaves, or challenge cancelled

    // Update all participants who didn't complete
    await prisma.challengeParticipant.updateMany({
      where: {
        challengeId: challenge.id,
        status: {
          not: "COMPLETED",
        },
      },
      data: {
        status: "FAILED",
      },
    });

    // Award badges if public challenge
    if (challenge.isPublic) {
      await awardChallengeBadges(challenge.id);
      
      // Notify admin about challenge completion and top performers
      try {
        const { createNotification } = await import("./NotificationHelper");
        const topPerformers = await prisma.challengeParticipant.findMany({
          where: {
            challengeId: challenge.id,
            status: "COMPLETED",
          },
          orderBy: { rank: "asc" },
          take: 10,
          include: {
            user: {
              select: {
                userName: true,
                name: true,
                lastName: true,
              },
            },
          },
        });

        await createNotification(challenge.createdBy, "CHALLENGE_COMPLETED", {
          challengeId: challenge.id,
          challengeName: challenge.name,
          topPerformers: topPerformers.map((p) => ({
            rank: p.rank,
            userName: p.user.userName,
            name: `${p.user.name} ${p.user.lastName}`.trim(),
            points: p.points,
          })),
        });
      } catch (error) {
        console.error("Error sending completion notification:", error);
      }
    }
  }
}

/**
 * Recalculate points and rankings for a challenge
 */
export async function recalculateChallengePoints(challengeId: string): Promise<void> {
  const participants = await prisma.challengeParticipant.findMany({
    where: { challengeId },
  });

  for (const participant of participants) {
    const points = await calculateChallengePoints(participant.userId, challengeId);
    await prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: { points },
    });
  }

  // Update rankings
  await updateChallengeRankings(challengeId);
}

