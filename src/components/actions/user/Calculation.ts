import axios from "axios";
import { GithubTokenExtract } from "../../../utils/github/GithubBackchodi";

/**
* Fetch contribution stats (commits, issues, PRs, reviews, stars, followers)
* for a GitHub user within a specific date range.
*
* If fromDate is omitted, fetch last 365 days up to today.
*
* @param username   GitHub login name
* @param fromDate   Optional ISO date string or Date; range is from this date to today
* @returns          { username, fromDate, toDate, stats, score }
*/
export async function fetchGitHubStatsForYear(
  username: string,
  fromDate?: string | Date,
) {


  
  const token = await GithubTokenExtract(username) ; // ← set in your .env file
  if (!token) throw new Error("Missing GITHUB_TOKEN environment variable");
  
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const now = new Date();
  const start = fromDate ? new Date(fromDate) : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const fromIso = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0)).toISOString();
  const toIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59)).toISOString();

  /** 1️⃣ GraphQL query: fetch contributions summary for the year */
  // Fetch followers and stars (does not depend on date range)
  const queryMeta = `
    query($login: String!) {
      user(login: $login) {
        followers { totalCount }
        repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
          nodes { stargazers { totalCount } }
        }
      }
    }
  `;

  const { data: metaRes } = await axios.post(
    "https://api.github.com/graphql",
    { query: queryMeta, variables: { login: username } },
    { headers }
  );
  if (metaRes.errors) throw new Error(metaRes.errors[0].message);
  const metaUser = metaRes.data.user;
  if (!metaUser) throw new Error("User not found");

  type RepoNode = { stargazers: { totalCount: number } };
  const repoNodes: RepoNode[] = metaUser.repositories.nodes as RepoNode[];
  const totalStars = repoNodes.reduce(
    (acc: number, r: RepoNode) => acc + r.stargazers.totalCount,
    0
  );
  const followers = metaUser.followers.totalCount as number;

  // Fetch contributions in <= 1-year windows and aggregate totals
  const queryTotals = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          contributionCalendar { totalContributions }
        }
      }
    }
  `;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneYearMs = 365 * oneDayMs;
  const desiredStart = start;
  const end = new Date(now.getTime());

  let windowStart = new Date(desiredStart.getTime());
  let commits = 0;
  let issues = 0;
  let prs = 0;
  let reviews = 0;
  let totalContributions = 0;

  while (windowStart <= end) {
    const windowEnd = new Date(
      Math.min(windowStart.getTime() + oneYearMs - oneDayMs, end.getTime())
    );

    const wFromIso = new Date(Date.UTC(
      windowStart.getUTCFullYear(),
      windowStart.getUTCMonth(),
      windowStart.getUTCDate(),
      0, 0, 0
    )).toISOString();
    const wToIso = new Date(Date.UTC(
      windowEnd.getUTCFullYear(),
      windowEnd.getUTCMonth(),
      windowEnd.getUTCDate(),
      23, 59, 59
    )).toISOString();

    const { data: totRes } = await axios.post(
      "https://api.github.com/graphql",
      { query: queryTotals, variables: { login: username, from: wFromIso, to: wToIso } },
      { headers }
    );
    if (totRes.errors) throw new Error(totRes.errors[0].message);
    const totalsUser = totRes.data.user;
    if (!totalsUser) throw new Error("User not found");
    const c = totalsUser.contributionsCollection;
    commits += c.totalCommitContributions;
    issues += c.totalIssueContributions;
    prs += c.totalPullRequestContributions;
    reviews += c.totalPullRequestReviewContributions;
    totalContributions += c.contributionCalendar.totalContributions;

    // Next window starts the day after current windowEnd
    windowStart = new Date(windowEnd.getTime() + oneDayMs);
  }

  const stats = {
    commits,
    issues,
    prs,
    reviews,
    totalContributions,
    stars: totalStars,
    followers,
  };

  /** 3️⃣ Weighted scoring model */
  const score =
    stats.commits * 0.5 +
    stats.prs * 2 +
    stats.issues * 1 +
    stats.reviews * 1.5 +
    stats.stars * 0.3 +
    stats.followers * 1;

  return { username, fromDate: fromIso, toDate: toIso, stats, score };
}
