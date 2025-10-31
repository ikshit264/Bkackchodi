import { NextRequest, NextResponse } from "next/server";
import getPrismaClient from "../../../../lib/prisma";
import { fetchGithubStats, fullOrPartialScoreFetch, processCalendar, updateRanksAtomic } from "../../../../lib/BackendHelpers";

const prisma = getPrismaClient();


// ----- ROUTE HANDLERS -----
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // console.log('searchParams', searchParams);
    const userName = searchParams.get("userName");
    const year = searchParams.get("year");
    // console.log('userName', userName);
    if (!userName) {
      return NextResponse.json({ error: "userName required" }, { status: 400 });
    }
    // Look up User and Score
    const user = await prisma.user.findFirst({ where: { userName } });
    if (!user)
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    const score = await prisma.score.findUnique({ where: { userId: user.id } });
    // Always send matrix and all required props to the client
    // If not present (because of cold start, old DB, or never POSTed), send empty arrays/zeros instead of undefined
    let temp = [];
    if (
      score &&
      typeof score.lastUpdatedDate === "object" &&
      user.githubToken
    ) {
      const fromDate = year ? `${year}-01-01T00:00:00Z` : undefined;
      const toDate = year ? `${year}-12-31T23:59:59Z` : undefined;
      const coll = await fetchGithubStats({
        userName,
        token: user.githubToken,
        fromDate,
        toDate,
      });
      const { matrix } = processCalendar(coll.contributionCalendar);
      temp = matrix;
    }
    const matrix: Array<Array<{ date: string; count: number } | null>> = temp;
    // Compose response
    return NextResponse.json({
      ...score,
      matrix: matrix, // guarantee a matrix even if user or score is new
      totalActiveDays: score?.totalActiveDays ?? 0,
      currentStreak: score?.currentStreak ?? 0,
      longestStreak: score?.longestStreak ?? 0,
      finalScore: score?.finalScore ?? 0,
      pullRequests: score?.pullRequests ?? 0,
      commits: score?.commits ?? 0,
      review: score?.review ?? 0,
      issue: score?.issue ?? 0,
      contribution: score?.contribution ?? 0,
      lastUpdatedDate: score?.lastUpdatedDate ?? null,
      rank: score?.rank ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || err.toString() },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userName, year, forceFetch } = body;
    console.log('userName', userName, 'year', year, 'forceFetch', forceFetch);
    if (!userName)
      return NextResponse.json({ error: "userName required" }, { status: 400 });

    const user = await prisma.user.findFirst({ where: { userName } });
    if (!user || !user.githubToken)
      return NextResponse.json(
        { error: "user/github token not found" },
        { status: 404 }
      );
    const scoreData = await fullOrPartialScoreFetch({
      userId: user.id,
      userName,
      githubToken: user.githubToken,
      year,
      forceFetch,
    });
    // console.log('scoreData', scoreData);
    await updateRanksAtomic();
    return NextResponse.json({ ...scoreData });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || err.toString() },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  // For extensibility: partial updates (future)
  return NextResponse.json({ error: "PATCH not implemented" }, { status: 405 });
}
