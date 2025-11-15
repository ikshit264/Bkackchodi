/**
 * Location Service
 * Handles location-based features and leaderboards
 */

import { prisma } from "./prisma";

/**
 * Update user location
 */
export async function updateUserLocation(
  userId: string,
  location: {
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  }
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      country: location.country,
      city: location.city,
      region: location.region,
      timezone: location.timezone,
    },
  });
}

/**
 * Get country leaderboard
 */
export async function getCountryLeaderboard(
  country: string,
  limit: number = 100
): Promise<any[]> {
  const leaderboard = await prisma.score.findMany({
    where: {
      user: {
        country: {
          equals: country,
          mode: "insensitive",
        },
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
          email: true,
          country: true,
          city: true,
        },
      },
    },
    orderBy: [
      { finalScore: "desc" },
      { lastUpdatedDate: "desc" },
    ],
    take: limit,
  });

  return leaderboard.map((score, index) => ({
    rank: index + 1,
    userId: score.userId,
    userName: score.user.name,
    avatar: score.user.avatar,
    finalScore: score.finalScore,
    githubScore: score.githubScore,
    commits: score.commits,
    pullRequests: score.pullRequests,
    city: score.user.city,
  }));
}

/**
 * Get city leaderboard
 */
export async function getCityLeaderboard(
  city: string,
  limit: number = 100
): Promise<any[]> {
  const leaderboard = await prisma.score.findMany({
    where: {
      user: {
        city: {
          equals: city,
          mode: "insensitive",
        },
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
          email: true,
          city: true,
        },
      },
    },
    orderBy: [
      { finalScore: "desc" },
      { lastUpdatedDate: "desc" },
    ],
    take: limit,
  });

  return leaderboard.map((score, index) => ({
    rank: index + 1,
    userId: score.userId,
    userName: score.user.name,
    avatar: score.user.avatar,
    finalScore: score.finalScore,
    githubScore: score.githubScore,
    commits: score.commits,
    pullRequests: score.pullRequests,
  }));
}

/**
 * Get regional leaderboard
 */
export async function getRegionalLeaderboard(
  region: string,
  limit: number = 100
): Promise<any[]> {
  const leaderboard = await prisma.score.findMany({
    where: {
      user: {
        region: {
          equals: region,
          mode: "insensitive",
        },
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
          email: true,
          region: true,
          country: true,
        },
      },
    },
    orderBy: [
      { finalScore: "desc" },
      { lastUpdatedDate: "desc" },
    ],
    take: limit,
  });

  return leaderboard.map((score, index) => ({
    rank: index + 1,
    userId: score.userId,
    userName: score.user.name,
    avatar: score.user.avatar,
    finalScore: score.finalScore,
    githubScore: score.githubScore,
    commits: score.commits,
    pullRequests: score.pullRequests,
    country: score.user.country,
  }));
}

/**
 * Get popular locations
 */
export async function getPopularLocations(): Promise<any> {
  const countries = await prisma.user.groupBy({
    by: ["country"],
    where: {
      country: {
        not: null,
      },
    },
    _count: {
      country: true,
    },
    orderBy: {
      _count: {
        country: "desc",
      },
    },
    take: 10,
  });

  const cities = await prisma.user.groupBy({
    by: ["city"],
    where: {
      city: {
        not: null,
      },
    },
    _count: {
      city: true,
    },
    orderBy: {
      _count: {
        city: "desc",
      },
    },
    take: 10,
  });

  return {
    countries: countries.map((c) => ({
      name: c.country,
      count: c._count.country,
    })),
    cities: cities.map((c) => ({
      name: c.city,
      count: c._count.city,
    })),
  };
}


