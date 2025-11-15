/**
 * Analytics Service
 * Handles data aggregation, performance metrics, and trend analysis
 */

import { prisma } from "./prisma";

export interface UserAnalytics {
  totalProjects: number;
  completedProjects: number;
  totalCourses: number;
  completedCourses: number;
  badgesEarned: number;
  currentStreak: number;
  longestStreak: number;
  totalContributions: number;
  averageProjectScore: number;
  rank: number | null;
  score: {
    finalScore: number;
    githubScore: number;
    commits: number;
    pullRequests: number;
  };
}

export interface TrendData {
  date: string;
  score: number;
  projects: number;
  courses: number;
  badges: number;
}

/**
 * Get user analytics
 */
export async function getUserAnalytics(userId: string): Promise<UserAnalytics> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      score: true,
      courses: {
        where: { isDeleted: false },
        include: {
          batch: {
            include: {
              projects: true,
            },
          },
        },
      },
      userBadges: true,
      dailyContributions: {
        select: {
          count: true,
        },
      },
    },
  });

  if (!user || !user.score) {
    throw new Error("User not found or has no score");
  }

  const totalProjects = user.courses.reduce(
    (sum, course) =>
      sum + course.batch.reduce((batchSum, batch) => batchSum + batch.projects.length, 0),
    0
  );

  const completedProjects = user.courses.reduce(
    (sum, course) =>
      sum +
      course.batch.reduce(
        (batchSum, batch) =>
          batchSum + batch.projects.filter((p) => p.status === "completed").length,
        0
      ),
    0
  );

  const totalCourses = user.courses.length;
  const completedCourses = user.courses.filter((c) => c.status === "completed").length;

  const allProjects = user.courses.flatMap((c) =>
    c.batch.flatMap((b) => b.projects)
  );
  const evaluatedProjects = allProjects.filter(
    (p) => p.aiEvaluationScore !== null && p.aiEvaluationScore !== undefined
  );
  const averageProjectScore =
    evaluatedProjects.length > 0
      ? evaluatedProjects.reduce((sum, p) => sum + (p.aiEvaluationScore || 0), 0) /
        evaluatedProjects.length
      : 0;

  const totalContributions = user.dailyContributions.reduce(
    (sum, c) => sum + c.count,
    0
  );

  return {
    totalProjects,
    completedProjects,
    totalCourses,
    completedCourses,
    badgesEarned: user.userBadges.length,
    currentStreak: user.score.currentStreak,
    longestStreak: user.score.longestStreak,
    totalContributions,
    averageProjectScore,
    rank: user.score.rank,
    score: {
      finalScore: user.score.finalScore,
      githubScore: user.score.githubScore,
      commits: user.score.commits,
      pullRequests: user.score.pullRequests,
    },
  };
}

/**
 * Get user trends over time
 */
export async function getUserTrends(
  userId: string,
  days: number = 30
): Promise<TrendData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get performance snapshots
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

  // Get daily contributions
  const contributions = await prisma.dailyContribution.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  // Get user badges earned in this period
  const badges = await prisma.userBadge.findMany({
    where: {
      userId,
      earnedAt: {
        gte: startDate,
      },
    },
    orderBy: {
      earnedAt: "asc",
    },
  });

  // Combine data by date
  const dateMap = new Map<string, TrendData>();

  snapshots.forEach((snapshot) => {
    const dateStr = snapshot.snapshotDate.toISOString().split("T")[0];
    const metrics = snapshot.metrics as any;
    dateMap.set(dateStr, {
      date: dateStr,
      score: metrics.finalScore || 0,
      projects: metrics.projectsCount || 0,
      courses: metrics.coursesCount || 0,
      badges: 0,
    });
  });

  // Add contribution data
  contributions.forEach((contribution) => {
    const dateStr = contribution.date.toISOString().split("T")[0];
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, {
        date: dateStr,
        score: 0,
        projects: 0,
        courses: 0,
        badges: 0,
      });
    }
  });

  // Add badge data
  badges.forEach((badge) => {
    const dateStr = badge.earnedAt.toISOString().split("T")[0];
    const existing = dateMap.get(dateStr);
    if (existing) {
      existing.badges += 1;
    } else {
      dateMap.set(dateStr, {
        date: dateStr,
        score: 0,
        projects: 0,
        courses: 0,
        badges: 1,
      });
    }
  });

  return Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/**
 * Get group analytics
 */
export async function getGroupAnalytics(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        where: { leftAt: null },
        include: {
          user: {
            include: {
              score: true,
              courses: {
                where: { isDeleted: false },
                include: {
                  batch: {
                    include: {
                      projects: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      scores: {
        orderBy: {
          finalScore: "desc",
        },
        take: 10,
      },
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  const totalMembers = group.members.length;
  const totalProjects = group.members.reduce(
    (sum, member) =>
      sum +
      member.user.courses.reduce(
        (courseSum, course) =>
          courseSum +
          course.batch.reduce((batchSum, batch) => batchSum + batch.projects.length, 0),
        0
      ),
    0
  );

  const averageScore =
    group.scores.length > 0
      ? group.scores.reduce((sum, s) => sum + s.finalScore, 0) / group.scores.length
      : 0;

  return {
    groupId: group.id,
    groupName: group.name,
    totalMembers,
    totalProjects,
    averageScore,
    topMembers: group.scores.map((score, index) => ({
      rank: index + 1,
      userId: score.userId,
      finalScore: score.finalScore,
    })),
  };
}

/**
 * Get sector analytics (same as group but for CATEGORY groups)
 */
export async function getSectorAnalytics(sectorId: string) {
  return getGroupAnalytics(sectorId);
}

/**
 * Get global analytics (admin only)
 */
export async function getGlobalAnalytics() {
  const totalUsers = await prisma.user.count();
  const totalCourses = await prisma.course.count({ where: { isDeleted: false } });
  const totalProjects = await prisma.project.count();
  const totalBadges = await prisma.badge.count();
  const totalGroups = await prisma.group.count({ where: { isDeleted: false } });

  const averageScore = await prisma.score.aggregate({
    _avg: {
      finalScore: true,
    },
  });

  const topUsers = await prisma.score.findMany({
    orderBy: {
      finalScore: "desc",
    },
    take: 10,
    include: {
      user: {
        select: {
          id: true,
          userName: true,
          name: true,
          lastName: true,
        },
      },
    },
  });

  return {
    totalUsers,
    totalCourses,
    totalProjects,
    totalBadges,
    totalGroups,
    averageScore: averageScore._avg.finalScore || 0,
    topUsers: topUsers.map((score, index) => ({
      rank: index + 1,
      userId: score.userId,
      userName: score.user.userName,
      name: `${score.user.name} ${score.user.lastName}`.trim(),
      finalScore: score.finalScore,
    })),
  };
}












