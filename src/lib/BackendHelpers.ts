import getPrismaClient from "./prisma";

const prisma = getPrismaClient();

// ----- UTILITIES -----
export async function fetchGithubStats({ userName, token, fromDate, toDate }) {

  const url = "https://api.github.com/graphql";
  const query = `
    query($userName: String!, $from: DateTime, $to: DateTime) {
      user(login: $userName) {
      createdAt   
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          contributionYears
        }
      }
    }
  `;
  const variables = {
    userName,
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate ? { to: toDate } : {}),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!json.data?.user) throw new Error(json.errors?.[0]?.message || "No user");
return {
  contributionsCollection: json.data.user.contributionsCollection,
  githubCreatedAt: json.data.user.createdAt,
};

}

// Process heatmap-style data like frontend (for contributions matrix, streaks, etc)
export function processCalendar(calendar) {
  let allDates = [];
  const allWeeks = [];

  calendar.weeks.forEach((week) => {
    const weekArr = [];
    const contributionDays = week.contributionDays;

    const firstDayDate = contributionDays[0]?.date;
    const firstDayOfWeek = firstDayDate ? new Date(firstDayDate).getDay() : 0; // 0 for Sunday

    // Prepend nulls to ensure the week starts on Sunday
    for (let i = 0; i < firstDayOfWeek; i++) {
      weekArr.push(null);
    }

    // 2. Add the actual contribution data
    contributionDays.forEach((d) => {
      const dayCell = {
        date: d.date,
        count: d.contributionCount,
      };
      weekArr.push(dayCell);
      if (d.contributionCount > 0) allDates.push(d.date);
    });

    // 3. Append nulls to ensure the week ends on Saturday
    while (weekArr.length < 7) {
      weekArr.push(null);
    }

    allWeeks.push(weekArr);
  });

  allDates = allDates.sort();

  // Count totalActiveDays
  const totalActiveDays = allDates.length;

  // Calculate streaks (helper)
  function streaks(dates) {
    // dates sorted string yyyy-mm-dd
    if (dates.length === 0) return { current: 0, longest: 0 };
    let streak = 1,
      longest = 1;
    let current = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const prev = new Date(dates[i]).valueOf();
      const next = new Date(dates[i + 1]).valueOf();
      const diff = (next - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) current++;
      else break;
    }
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]).valueOf();
      const curr = new Date(dates[i]).valueOf();
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else streak = 1;
      if (streak > longest) longest = streak;
    }
    return { current, longest };
  }
  const { current, longest } = streaks(allDates);

  // console.log(`allWeeks`, allWeeks, 'totalActiveDays', totalActiveDays, 'currentStreak', current, 'longestStreak', longest);
  return {
    matrix: allWeeks,
    totalActiveDays,
    currentStreak: current,
    longestStreak: longest,
  };
}

function calcFinalScore(fields: {
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
}) {
  // e.g., Add up values; tweak this to match your frontend's formula!
  // Weightage: commits (2), PRs (4), issues (3), reviews (1.5), totalActiveDays(2), streaks(2)...
  return (
    2 * fields.commits +
    4 * fields.pullRequests +
    3 * fields.issues +
    1.5 * fields.reviews +
    2 * fields.totalActiveDays +
    2 * fields.currentStreak +
    1.5 * fields.longestStreak
  );
}

// ----- MAIN HANDLER LOGIC -----
export async function fullOrPartialScoreFetch({
  userId,
  userName,
  githubToken,
  year,
  forceFetch,
}) {
  // 1. Fetch existing Score row (if any)
  const oldScore = await prisma.score.findUnique({ where: { userId } });
  const oldScoreDate = oldScore?.lastUpdatedDate;
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  // check if oldScore Date is of today if yes return oldScore but the condition is forceFetch must be false for this condition if forceFetch is true i want the whole function to execute
  if (!forceFetch && oldScoreDate) {
    const timeDiff = Date.now() - new Date(oldScoreDate).getTime();
    if (timeDiff < TWELVE_HOURS) {
      return oldScore;
    }
  }

  // 2. Build date range for GitHub fetch
  const fromDate = year ? `${year}-01-01T00:00:00Z` : undefined;
  const toDate = year ? `${year}-12-31T23:59:59Z` : undefined;

  // 3. Fetch github with year filter
  const colls = await fetchGithubStats({
    userName,
    token: githubToken,
    fromDate,
    toDate,
  });

  const coll = colls.contributionsCollection;

  // 4. Process calendar data
  const { matrix, totalActiveDays, currentStreak, longestStreak } =
    processCalendar(coll.contributionCalendar);
  const commits = coll.totalCommitContributions;
  const issues = coll.totalIssueContributions;
  const pullRequests = coll.totalPullRequestContributions;
  const reviews = coll.totalPullRequestReviewContributions;
  const contribution = coll.contributionCalendar.totalContributions;
  const finalScore = calcFinalScore({
    commits,
    pullRequests,
    issues,
    reviews,
    totalActiveDays,
    currentStreak,
    longestStreak,
  });

  // 5. Get available years
  const currentYear = new Date().getFullYear();
  const availableYears = [];
  for (let y = 2008; y <= currentYear; y++) {
    availableYears.push(y);
  }

  // 6. Update user Score (only if not year-filtered, or if you want to track per-year)
  if (!year) {
    let scoreRow;
    if (oldScore) {
      scoreRow = await prisma.score.update({
        where: { userId },
        data: {
          totalActiveDays,
          currentStreak,
          longestStreak,
          finalScore,
          pullRequests,
          commits,
          review: reviews,
          issue: issues,
          contribution,
          lastUpdatedDate: new Date(),
        },
      });
    } else {
      scoreRow = await prisma.score.create({
        data: {
          userId,
          totalActiveDays,
          currentStreak,
          longestStreak,
          finalScore,
          pullRequests,
          commits,
          review: reviews,
          issue: issues,
          contribution,
          lastUpdatedDate: new Date(),
        },
      });
    }
    return {
      ...scoreRow,
      matrix,
      contribution,
      commits,
      issues,
      pullRequests,
      reviews,
      totalActiveDays,
      currentStreak,
      longestStreak,
      finalScore,
      availableYears,
    };
  }

  // For year-specific view, return data without updating DB
  return {
    matrix,
    contribution,
    commits,
    issues,
    pullRequests,
    reviews,
    totalActiveDays,
    currentStreak,
    longestStreak,
    finalScore,
    availableYears,
    rank: oldScore?.rank ?? null,
  };
}

export async function updateRanksAtomic() {
  // Lock all in-memory (for demo); PRODUCTION: should use real concurrency locking/transaction!
  // 1. Get all users, sorted by finalScore desc, then contribution desc, then lastUpdatedDate desc
  const all = await prisma.score.findMany();
  all.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.contribution !== a.contribution)
      return b.contribution - a.contribution;
    if (b.lastUpdatedDate && a.lastUpdatedDate) {
      if (b.lastUpdatedDate > a.lastUpdatedDate) return 1;
      if (a.lastUpdatedDate > b.lastUpdatedDate) return -1;
    }
    return 0;
  });
  // 2. Assign Rank (1-based)
  for (let i = 0; i < all.length; i++) {
    await prisma.score.update({
      where: { userId: all[i].userId },
      data: { rank: i + 1 },
    });
  }
}
