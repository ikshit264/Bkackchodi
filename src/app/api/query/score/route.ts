/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";
import { fetchGithubStats, fullOrPartialScoreFetch, processCalendar, updateRanksAtomic } from "../../../../lib/BackendHelpers";

const prisma = getPrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userName = searchParams.get("userName");
    const year = searchParams.get("year");

    if (!userName) {
      return NextResponse.json({ error: "userName required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { userName } });
    if (!user)
      return NextResponse.json({ error: "user not found" }, { status: 404 });

    const score = await prisma.score.findUnique({ where: { userId: user.id } });

    let temp: any[] = [];
    const availableYears: number[] = [];
    let githubCreatedAt: string | null = null;

    if (score && typeof score.lastUpdatedDate === "object" && user.githubToken) {
      const fromDate = year ? `${year}-01-01T00:00:00Z` : undefined;
      const toDate = year ? `${year}-12-31T23:59:59Z` : undefined;

      const coll = await fetchGithubStats({
        userName,
        token: user.githubToken,
        fromDate,
        toDate,
      });

      // ✅ extract safely
      githubCreatedAt = coll.githubCreatedAt ?? null;

      const contributions = coll.contributionsCollection;
      if (contributions?.contributionCalendar) {
        const { matrix } = processCalendar(contributions.contributionCalendar);
        temp = matrix;
      }

      // ✅ Build available years from github account creation
      if (githubCreatedAt) {
        const createdYear = new Date(githubCreatedAt).getFullYear();
        const currentYear = new Date().getFullYear();
        for (let y = createdYear; y <= currentYear; y++) {
          availableYears.push(y);
        }
      }
    }

    const matrix: Array<Array<{ date: string; count: number } | null>> = temp;

    return NextResponse.json({
      ...score,
      matrix,
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
      githubCreatedAt, // ✅ include it
      availableYears,  // ✅ consistent naming
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || err.toString() },
      { status: 500 }
    );
  }
}


export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    // Track login when user fetches their score
    if (clerkId) {
      try {
        const { trackUserLogin } = await import("../../../../lib/LoginTrackingHelper");
        await trackUserLogin(clerkId);
      } catch (error) {
        console.error("Error tracking login in score fetch:", error);
        // Continue even if tracking fails
      }
    }

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
