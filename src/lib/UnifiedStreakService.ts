/**
 * Unified Streak Service
 * Combines GitHub contributions and App contributions for unified streak calculation
 * GitHub contributions have higher weight, but app activities also count
 */

import { prisma } from "./prisma";

export interface UnifiedStreakResult {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  githubStreak: number; // GitHub-only streak (for analytics)
  appStreak: number; // App-only streak (for analytics)
  combinedStreak: number; // Combined streak (used in scoring)
}

/**
 * Calculate unified streaks from both GitHub and App contributions
 * GitHub contributions count as 1.0, App contributions count as 0.5 (configurable)
 */
export async function calculateUnifiedStreaks(
  userId: string,
  githubContributionDates: string[] = [],
  appContributionWeight: number = 0.5
): Promise<UnifiedStreakResult> {
  // Get app contributions
  const appContributions = await prisma.dailyContribution.findMany({
    where: { userId },
    select: {
      date: true,
      contributionType: true,
      count: true,
    },
    orderBy: { date: "asc" },
  });

  // Get unique app contribution dates
  // For LOGIN, count doesn't matter - it's boolean (logged in that day or not)
  // For other types, we check if count > 0
  const appDates = Array.from(
    new Set(
      appContributions
        .filter((c) => {
          // For LOGIN, any record means user logged in (boolean)
          // For other types, count must be > 0
          if (c.contributionType === "LOGIN") {
            return true; // Any login record counts
          }
          return c.count > 0; // Other types need count > 0
        })
        .map((c) => c.date.toISOString().split("T")[0])
    )
  ).sort();

  // Combine dates with weights
  // GitHub dates get weight 1.0, App dates get weight 0.5
  const dateWeights = new Map<string, number>();

  // Add GitHub contributions (weight 1.0)
  githubContributionDates.forEach((date) => {
    const existing = dateWeights.get(date) || 0;
    dateWeights.set(date, existing + 1.0);
  });

  // Add app contributions (weight 0.5)
  appDates.forEach((date) => {
    const existing = dateWeights.get(date) || 0;
    dateWeights.set(date, existing + appContributionWeight);
  });

  // A day counts if total weight >= 0.5 (at least one app contribution or any GitHub)
  const activeDates = Array.from(dateWeights.entries())
    .filter(([_, weight]) => weight >= 0.5)
    .map(([date]) => date)
    .sort();

  // Calculate GitHub-only streak (for analytics)
  const githubStreak = calculateStreakFromDates(githubContributionDates);

  // Calculate App-only streak (for analytics)
  const appStreak = calculateStreakFromDates(appDates);

  // Calculate combined streak (for scoring)
  const combinedStreak = calculateStreakFromDates(activeDates);

  return {
    currentStreak: combinedStreak.current,
    longestStreak: combinedStreak.longest,
    totalActiveDays: activeDates.length,
    githubStreak: githubStreak.current,
    appStreak: appStreak.current,
    combinedStreak: combinedStreak.current,
  };
}

/**
 * Calculate streak from a sorted array of date strings (YYYY-MM-DD)
 */
function calculateStreakFromDates(dates: string[]): {
  current: number;
  longest: number;
} {
  if (dates.length === 0) return { current: 0, longest: 0 };

  // Use UTC dates to avoid timezone issues
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  
  const todayStr = today.toISOString().split("T")[0];
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  let currentStreak = 0;
  const hasToday = dates.includes(todayStr);
  const hasYesterday = dates.includes(yesterdayStr);

  if (hasToday || hasYesterday) {
    let checkDate = hasToday ? new Date(today) : new Date(yesterday);
    let streakDays = 0;

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (dates.includes(dateStr)) {
        streakDays++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }
    currentStreak = streakDays;
  }

  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { current: currentStreak, longest: longestStreak };
}

/**
 * Track user login as a contribution
 * Login is a boolean - either logged in that day or not (count doesn't matter)
 * This ensures only one login record per day, regardless of how many times user logs in
 */
export async function trackLogin(userId: string): Promise<void> {
  // Use UTC date to avoid timezone issues
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  // Use upsert to ensure only one login record per day
  // If login already exists for today, don't increment count (it's a boolean)
  await prisma.dailyContribution.upsert({
    where: {
      userId_date_contributionType: {
        userId,
        date: today,
        contributionType: "LOGIN",
      },
    },
    update: {
      // Don't increment - login is boolean (either logged in or not)
      // Just update the timestamp to latest login
      metadata: {
        timestamp: new Date().toISOString(),
        source: "authentication",
        lastLogin: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
    create: {
      userId,
      date: today,
      contributionType: "LOGIN",
      count: 1, // Always 1 for login (boolean)
      metadata: {
        timestamp: new Date().toISOString(),
        source: "authentication",
        firstLogin: new Date().toISOString(),
      },
    },
  });
}

/**
 * Get all activities for a specific date
 */
export async function getDailyActivities(
  userId: string,
  date: Date
): Promise<Array<{
  type: string;
  count: number;
  metadata: any;
  timestamp: string;
}>> {
  // Use UTC date to avoid timezone issues
  const dateStr = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));

  const contributions = await prisma.dailyContribution.findMany({
    where: {
      userId,
      date: dateStr,
    },
    orderBy: { createdAt: "asc" },
  });

  return contributions.map((c) => ({
    type: c.contributionType,
    count: c.count,
    metadata: c.metadata,
    timestamp: c.createdAt.toISOString(),
  }));
}

/**
 * Get activity log for a date range
 */
export async function getActivityLog(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{
  date: string;
  activities: Array<{
    type: string;
    count: number;
    metadata: any;
  }>;
  totalContributions: number;
}>> {
  // Use UTC dates to avoid timezone issues
  const startUTC = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
    0, 0, 0, 0
  ));
  const endUTC = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
    23, 59, 59, 999
  ));

  const contributions = await prisma.dailyContribution.findMany({
    where: {
      userId,
      date: {
        gte: startUTC,
        lte: endUTC,
      },
    },
    orderBy: { date: "asc" },
  });

  // Group by date
  const dateMap = new Map<
    string,
    Array<{ type: string; count: number; metadata: any }>
  >();

  contributions.forEach((c) => {
    const dateStr = c.date.toISOString().split("T")[0];
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, []);
    }
    dateMap.get(dateStr)!.push({
      type: c.contributionType,
      count: c.count,
      metadata: c.metadata,
    });
  });

  return Array.from(dateMap.entries()).map(([date, activities]) => ({
    date,
    activities,
    totalContributions: activities.reduce((sum, a) => sum + a.count, 0),
  }));
}

