/**
 * Contribution Service
 * Handles daily contribution tracking and analytics
 */

import { prisma } from "./prisma";
import { ContributionType } from "@prisma/client";

export interface DayCell {
  date: string;
  count: number;
  types?: Record<string, number>; // Breakdown by contribution type
}

export interface ContributionStats {
  totalContributions: number;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  contributionsByType: Record<string, number>;
  firstContributionDate: string | null;
  lastContributionDate: string | null;
}

/**
 * Track a contribution for a user
 */
export async function trackContribution(
  userId: string,
  type: ContributionType,
  metadata?: Record<string, any>
): Promise<void> {
  // Use UTC date to avoid timezone issues
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  // Upsert: increment count if exists, create if not
  await prisma.dailyContribution.upsert({
    where: {
      userId_date_contributionType: {
        userId,
        date: today,
        contributionType: type,
      },
    },
    update: {
      count: { increment: 1 },
      metadata: metadata ? metadata : undefined,
      updatedAt: new Date(),
    },
    create: {
      userId,
      date: today,
      contributionType: type,
      count: 1,
      metadata: metadata || undefined,
    },
  });
}

/**
 * Get user's contribution stats
 */
export async function getUserContributionStats(
  userId: string,
  year?: number
): Promise<ContributionStats> {
  // Use UTC dates for date range if year is provided
  let whereClause: any = { userId };
  if (year) {
    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    whereClause.date = {
      gte: startDate,
      lte: endDate,
    };
  }

  const contributions = await prisma.dailyContribution.findMany({
    where: whereClause,
    orderBy: { date: "asc" },
  });

  if (contributions.length === 0) {
    return {
      totalContributions: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
      contributionsByType: {},
      firstContributionDate: null,
      lastContributionDate: null,
    };
  }

  // Calculate totals
  const totalContributions = contributions.reduce(
    (sum, c) => sum + c.count,
    0
  );
  const totalActiveDays = new Set(
    contributions.map((c) => c.date.toISOString().split("T")[0])
  ).size;

  // Group by type
  const contributionsByType: Record<string, number> = {};
  contributions.forEach((c) => {
    const type = c.contributionType;
    contributionsByType[type] = (contributionsByType[type] || 0) + c.count;
  });

  // Calculate streaks
  const dates = Array.from(
    new Set(contributions.map((c) => c.date.toISOString().split("T")[0]))
  ).sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Use UTC dates to avoid timezone issues
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  
  const todayStr = today.toISOString().split("T")[0];
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Check if user contributed today or yesterday (for current streak)
  const hasToday = dates.includes(todayStr);
  const hasYesterday = dates.includes(yesterdayStr);

  // Calculate current streak
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
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
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
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    totalContributions,
    currentStreak,
    longestStreak,
    totalActiveDays,
    contributionsByType,
    firstContributionDate: dates[0] || null,
    lastContributionDate: dates[dates.length - 1] || null,
  };
}

/**
 * Generate heatmap matrix for a year (similar to GitHub)
 * Returns 52 weeks x 7 days matrix
 */
export async function generateHeatmapMatrix(
  userId: string,
  year: number
): Promise<(DayCell | null)[][]> {
  // Use UTC dates to avoid timezone issues
  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  // Get all contributions for the year
  const contributions = await prisma.dailyContribution.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  // Create a map of date -> total count
  const dateMap = new Map<string, { count: number; types: Record<string, number> }>();
  contributions.forEach((c) => {
    const dateStr = c.date.toISOString().split("T")[0];
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { count: 0, types: {} });
    }
    const entry = dateMap.get(dateStr)!;
    entry.count += c.count;
    entry.types[c.contributionType] = (entry.types[c.contributionType] || 0) + c.count;
  });

      // Generate matrix: 52 weeks x 7 days
      const matrix: (DayCell | null)[][] = [];
      // Use UTC dates to avoid timezone issues
      const firstDayOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      const firstDayOfWeek = firstDayOfYear.getUTCDay(); // 0 = Sunday, 6 = Saturday

      // Start from the Sunday of the week containing Jan 1
      const startDate2 = new Date(firstDayOfYear);
      startDate2.setUTCDate(startDate2.getUTCDate() - firstDayOfWeek);

  // Generate 52 weeks
  for (let week = 0; week < 52; week++) {
    const weekData: (DayCell | null)[] = [];
        for (let day = 0; day < 7; day++) {
          const currentDate = new Date(startDate2);
          currentDate.setUTCDate(startDate2.getUTCDate() + week * 7 + day);
          currentDate.setUTCHours(0, 0, 0, 0);

          const currentYear = currentDate.getUTCFullYear();
          const dateStr = currentDate.toISOString().split("T")[0];

      // Only include dates within the year (or before Jan 1 if in first week)
      if (currentYear === year || (week === 0 && day < firstDayOfWeek)) {
        const entry = dateMap.get(dateStr);

        if (entry) {
          weekData.push({
            date: dateStr,
            count: entry.count,
            types: entry.types,
          });
        } else {
          weekData.push({
            date: dateStr,
            count: 0,
          });
        }
      } else {
        weekData.push(null);
      }
    }
    matrix.push(weekData);
  }

  return matrix;
}

/**
 * Get daily contributions for a specific date
 */
export async function getDailyContributions(
  userId: string,
  date: Date
): Promise<Array<{ type: ContributionType; count: number; metadata: any }>> {
  const dateStr = new Date(date);
  dateStr.setHours(0, 0, 0, 0);

  const contributions = await prisma.dailyContribution.findMany({
    where: {
      userId,
      date: dateStr,
    },
  });

  return contributions.map((c) => ({
    type: c.contributionType,
    count: c.count,
    metadata: c.metadata,
  }));
}

/**
 * Get contributions for a date range
 */
export async function getContributionsInRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; type: ContributionType; count: number }>> {
  const contributions = await prisma.dailyContribution.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  return contributions.map((c) => ({
    date: c.date.toISOString().split("T")[0],
    type: c.contributionType,
    count: c.count,
  }));
}

