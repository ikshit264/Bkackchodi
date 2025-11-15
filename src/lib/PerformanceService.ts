/**
 * Performance Service
 * Handles performance tracking, comparisons, and analytics
 */

import { prisma } from "./prisma";

/**
 * Create a performance snapshot for a user
 */
export async function createPerformanceSnapshot(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      score: true,
      courses: {
        include: {
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

  if (!user || !user.score) {
    return;
  }

  const metrics = {
    finalScore: user.score.finalScore,
    githubScore: user.score.githubScore,
    rank: user.score.rank,
    commits: user.score.commits,
    pullRequests: user.score.pullRequests,
    reviews: user.score.review,
    issues: user.score.issue,
    currentStreak: user.score.currentStreak,
    longestStreak: user.score.longestStreak,
    totalActiveDays: user.score.totalActiveDays,
    coursesCount: user.courses.length,
    completedCourses: user.courses.filter((c) => c.status === "completed").length,
    projectsCount: user.courses.reduce(
      (sum, course) =>
        sum + course.batch.reduce((batchSum, batch) => batchSum + batch.projects.length, 0),
      0
    ),
    completedProjects: user.courses.reduce(
      (sum, course) =>
        sum +
        course.batch.reduce(
          (batchSum, batch) =>
            batchSum + batch.projects.filter((p) => p.status === "completed").length,
          0
        ),
      0
    ),
    groupScores: user.groupScores.map((gs) => ({
      groupId: gs.groupId,
      groupName: gs.group.name,
      score: gs.finalScore,
      rank: gs.rank,
    })),
  };

  await prisma.performanceSnapshot.create({
    data: {
      userId,
      metrics,
      snapshotDate: new Date(),
    },
  });
}

/**
 * Compare two users' performance
 */
export async function compareUsers(
  userId: string,
  comparedUserId: string
): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      score: true,
      courses: {
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

  const comparedUser = await prisma.user.findUnique({
    where: { id: comparedUserId },
    include: {
      score: true,
      courses: {
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

  if (!user || !user.score || !comparedUser || !comparedUser.score) {
    throw new Error("User or compared user not found");
  }

  const userCompletedProjects = user.courses.reduce(
    (sum, course) =>
      sum +
      course.batch.reduce(
        (batchSum, batch) =>
          batchSum + batch.projects.filter((p) => p.status === "completed").length,
        0
      ),
    0
  );

  const comparedCompletedProjects = comparedUser.courses.reduce(
    (sum, course) =>
      sum +
      course.batch.reduce(
        (batchSum, batch) =>
          batchSum + batch.projects.filter((p) => p.status === "completed").length,
        0
      ),
    0
  );

  const metrics = {
    finalScore: {
      user: user.score.finalScore,
      compared: comparedUser.score.finalScore,
      difference: user.score.finalScore - comparedUser.score.finalScore,
    },
    githubScore: {
      user: user.score.githubScore,
      compared: comparedUser.score.githubScore,
      difference: user.score.githubScore - comparedUser.score.githubScore,
    },
    rank: {
      user: user.score.rank,
      compared: comparedUser.score.rank,
      difference: (comparedUser.score.rank || 0) - (user.score.rank || 0),
    },
    commits: {
      user: user.score.commits,
      compared: comparedUser.score.commits,
      difference: user.score.commits - comparedUser.score.commits,
    },
    pullRequests: {
      user: user.score.pullRequests,
      compared: comparedUser.score.pullRequests,
      difference: user.score.pullRequests - comparedUser.score.pullRequests,
    },
    completedProjects: {
      user: userCompletedProjects,
      compared: comparedCompletedProjects,
      difference: userCompletedProjects - comparedCompletedProjects,
    },
    currentStreak: {
      user: user.score.currentStreak,
      compared: comparedUser.score.currentStreak,
      difference: user.score.currentStreak - comparedUser.score.currentStreak,
    },
  };

  // Save comparison
  await prisma.performanceComparison.upsert({
    where: {
      userId_comparedUserId: {
        userId,
        comparedUserId,
      },
    },
    update: {
      metrics,
    },
    create: {
      userId,
      comparedUserId,
      metrics,
    },
  });

  return {
    user: {
      id: user.id,
      userName: user.userName,
      name: user.name,
      avatar: user.avatar,
    },
    comparedUser: {
      id: comparedUser.id,
      userName: comparedUser.userName,
      name: comparedUser.name,
      avatar: comparedUser.avatar,
    },
    metrics,
  };
}

/**
 * Get performance trends for a user
 */
export async function getPerformanceTrends(
  userId: string,
  days: number = 30
): Promise<any[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const snapshots = await prisma.performanceSnapshot.findMany({
    where: {
      userId,
      snapshotDate: {
        gte: startDate,
      },
    },
    orderBy: {
      snapshotDate: "asc",
    },
  });

  return snapshots.map((snapshot) => ({
    date: snapshot.snapshotDate,
    metrics: snapshot.metrics,
  }));
}

/**
 * Compare user with group average
 */
export async function compareWithGroupAverage(
  userId: string,
  groupId: string
): Promise<any> {
  const userScore = await prisma.groupScore.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  if (!userScore) {
    throw new Error("User is not a member of this group");
  }

  const allScores = await prisma.groupScore.findMany({
    where: { groupId },
  });

  const averageScore =
    allScores.reduce((sum, score) => sum + score.finalScore, 0) / allScores.length;

  return {
    userScore: userScore.finalScore,
    groupAverage: averageScore,
    difference: userScore.finalScore - averageScore,
    percentile: (allScores.filter((s) => s.finalScore < userScore.finalScore).length /
      allScores.length) *
      100,
  };
}

/**
 * Get strengths and weaknesses analysis
 */
export async function getStrengthsWeaknesses(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      score: true,
      courses: {
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

  if (!user || !user.score) {
    throw new Error("User not found");
  }

  const allUsers = await prisma.score.findMany({
    orderBy: { finalScore: "desc" },
    take: 1000,
  });

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Compare with average
  const avgCommits = allUsers.reduce((sum, s) => sum + s.commits, 0) / allUsers.length;
  const avgPRs = allUsers.reduce((sum, s) => sum + s.pullRequests, 0) / allUsers.length;
  const avgStreak = allUsers.reduce((sum, s) => sum + s.currentStreak, 0) / allUsers.length;

  if (user.score.commits > avgCommits * 1.2) {
    strengths.push("High commit activity");
  } else if (user.score.commits < avgCommits * 0.8) {
    weaknesses.push("Low commit activity");
  }

  if (user.score.pullRequests > avgPRs * 1.2) {
    strengths.push("Active in pull requests");
  } else if (user.score.pullRequests < avgPRs * 0.8) {
    weaknesses.push("Few pull requests");
  }

  if (user.score.currentStreak > avgStreak * 1.2) {
    strengths.push("Consistent daily activity");
  } else if (user.score.currentStreak < avgStreak * 0.8) {
    weaknesses.push("Inconsistent activity");
  }

  return {
    strengths,
    weaknesses,
    recommendations: weaknesses.map((w) => {
      if (w.includes("commit")) return "Try to commit code more regularly";
      if (w.includes("pull request")) return "Create more pull requests to collaborate";
      if (w.includes("activity")) return "Maintain a daily coding streak";
      return "Keep learning and practicing";
    }),
  };
}


