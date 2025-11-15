/**
 * Sector Service
 * Handles sector operations, scoring, and rankings
 */

import { prisma } from "./prisma";
import { calculateGroupScore } from "./GroupScoreCalculator";
import { calculateGlobalScore } from "./GlobalScoreCalculator";

/**
 * Calculate sector score for a user
 * Sector score is based on courses and projects in that sector
 */
export async function calculateSectorScore(
  userId: string,
  sectorId: string
): Promise<{
  score: number;
  coursesCount: number;
  projectsCount: number;
  completedProjects: number;
}> {
  // Get all courses in this sector for this user
  const courses = await prisma.course.findMany({
    where: {
      sectorId,
      userId,
    },
    include: {
      batch: {
        include: {
          projects: {
            select: {
              id: true,
              status: true,
              aiEvaluationScore: true,
            },
          },
        },
      },
    },
  });

  let coursesCount = 0;
  let projectsCount = 0;
  let completedProjects = 0;
  let totalScore = 0;

  for (const course of courses) {
    if (course.status !== "not started") {
      coursesCount++;
    }

    for (const batch of course.batch) {
      for (const project of batch.projects) {
        projectsCount++;
        if (project.status === "completed") {
          completedProjects++;
          // Add AI evaluation score if available
          if (project.aiEvaluationScore !== null) {
            totalScore += project.aiEvaluationScore;
          }
        }
      }
    }
  }

  // Calculate sector score
  // Weight: courses (20%), projects (30%), completed projects (50%)
  const sectorScore =
    coursesCount * 20 +
    projectsCount * 5 +
    completedProjects * 30 +
    totalScore * 0.5;

  return {
    score: Math.round(sectorScore),
    coursesCount,
    projectsCount,
    completedProjects,
  };
}

/**
 * Update or create SectorScore for a user in a sector
 */
export async function updateSectorScore(
  userId: string,
  sectorId: string
): Promise<void> {
  const calculated = await calculateSectorScore(userId, sectorId);

  // Update or create SectorScore
  await prisma.sectorScore.upsert({
    where: {
      userId_sectorId: {
        userId,
        sectorId,
      },
    },
    create: {
      userId,
      sectorId,
      score: calculated.score,
      lastUpdatedDate: new Date(),
    },
    update: {
      score: calculated.score,
      lastUpdatedDate: new Date(),
    },
  });

  // Update ranks for this sector
  await updateSectorRanks(sectorId);
}

/**
 * Update ranks for all users in a sector
 */
export async function updateSectorRanks(sectorId: string): Promise<void> {
  const scores = await prisma.sectorScore.findMany({
    where: {
      sectorId,
      user: {
        userSectors: {
          some: {
            sectorId,
          },
        },
      },
    },
    orderBy: [
      { score: "desc" },
      { lastUpdatedDate: "desc" },
      { id: "asc" },
    ],
    select: {
      id: true,
    },
  });

  await Promise.all(
    scores.map((score, index) =>
      prisma.sectorScore.update({
        where: { id: score.id },
        data: { rank: index + 1 },
      })
    )
  );
}

/**
 * Join a sector
 */
export async function joinSector(
  userId: string,
  sectorId: string
): Promise<boolean> {
  try {
    // Check if already joined
    const existing = await prisma.userSector.findUnique({
      where: {
        userId_sectorId: {
          userId,
          sectorId,
        },
      },
    });

    if (existing) {
      return false; // Already joined
    }

    // Join sector
    await prisma.userSector.create({
      data: {
        userId,
        sectorId,
      },
    });

    // Initialize sector score
    await updateSectorScore(userId, sectorId);

    return true;
  } catch (error) {
    console.error("Error joining sector:", error);
    return false;
  }
}

/**
 * Leave a sector
 */
export async function leaveSector(
  userId: string,
  sectorId: string
): Promise<boolean> {
  try {
    await prisma.userSector.delete({
      where: {
        userId_sectorId: {
          userId,
          sectorId,
        },
      },
    });

    // Delete sector score
    await prisma.sectorScore.deleteMany({
      where: {
        userId,
        sectorId,
      },
    });

    // Update ranks
    await updateSectorRanks(sectorId);

    return true;
  } catch (error) {
    console.error("Error leaving sector:", error);
    return false;
  }
}

/**
 * Initialize default sectors
 */
export async function initializeDefaultSectors() {
  const defaultSectors = [
    {
      name: "Web Development",
      description: "Frontend and backend web development technologies",
      icon: "🌐",
    },
    {
      name: "AI/ML",
      description: "Artificial Intelligence and Machine Learning",
      icon: "🤖",
    },
    {
      name: "Mobile Development",
      description: "iOS and Android mobile app development",
      icon: "📱",
    },
    {
      name: "DevOps",
      description: "DevOps, CI/CD, and infrastructure",
      icon: "⚙️",
    },
    {
      name: "Data Science",
      description: "Data analysis, visualization, and science",
      icon: "📊",
    },
    {
      name: "Cybersecurity",
      description: "Security, ethical hacking, and penetration testing",
      icon: "🔒",
    },
    {
      name: "Game Development",
      description: "Game design and development",
      icon: "🎮",
    },
    {
      name: "Blockchain",
      description: "Blockchain and cryptocurrency development",
      icon: "⛓️",
    },
  ];

  for (const sectorData of defaultSectors) {
    await prisma.sector.upsert({
      where: { name: sectorData.name },
      update: {},
      create: sectorData,
    });
  }

  return defaultSectors.length;
}


