import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";

/**
 * GET /api/analytics/compare
 * Compare current user's score with another user or top user
 * Query params: ?userId=<userId> or ?top=true
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const compareToTop = searchParams.get("top") === "true";

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Get current user's score
    const myScore = await prisma.score.findUnique({
      where: { userId: me.id },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            name: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    if (!myScore) {
      return NextResponse.json(
        {
          error: "You don't have a score yet. Start contributing to generate your score!",
        },
        { status: 404 }
      );
    }

    let targetScore: typeof myScore | null = null;
    let targetUser: typeof myScore.user | null = null;

    if (compareToTop) {
      // Compare to top user
      const topScore = await prisma.score.findFirst({
        orderBy: [
          { finalScore: "desc" },
          { lastUpdatedDate: "desc" },
        ],
        include: {
          user: {
            select: {
              id: true,
              userName: true,
              name: true,
              lastName: true,
              avatar: true,
              email: true,
            },
          },
        },
      });

      if (topScore) {
        targetScore = topScore;
        targetUser = topScore.user;
      }
    } else if (targetUserId) {
      // Compare to specific user
      const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          userName: true,
          name: true,
          lastName: true,
          avatar: true,
          email: true,
          score: {
            include: {
              user: {
                select: {
                  id: true,
                  userName: true,
                  name: true,
                  lastName: true,
                  avatar: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!target) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
      }

      if (!target.score) {
        return NextResponse.json(
          {
            error: "Target user doesn't have a score yet",
          },
          { status: 404 }
        );
      }

      targetScore = target.score;
      targetUser = target;
    } else {
      return NextResponse.json(
        { error: "Either userId or top=true query parameter is required" },
        { status: 400 }
      );
    }

    // Calculate differences
    const comparison = {
      me: {
        user: myScore.user,
        finalScore: myScore.finalScore,
        githubScore: myScore.githubScore,
        commits: myScore.commits,
        pullRequests: myScore.pullRequests,
        review: myScore.review,
        issue: myScore.issue,
        contribution: myScore.contribution,
        totalActiveDays: myScore.totalActiveDays,
        currentStreak: myScore.currentStreak,
        longestStreak: myScore.longestStreak,
      },
      target: {
        user: targetUser,
        finalScore: targetScore.finalScore,
        githubScore: targetScore.githubScore,
        commits: targetScore.commits,
        pullRequests: targetScore.pullRequests,
        review: targetScore.review,
        issue: targetScore.issue,
        contribution: targetScore.contribution,
        totalActiveDays: targetScore.totalActiveDays,
        currentStreak: targetScore.currentStreak,
        longestStreak: targetScore.longestStreak,
      },
      differences: {
        finalScore: myScore.finalScore - targetScore.finalScore,
        githubScore: myScore.githubScore - targetScore.githubScore,
        commits: myScore.commits - targetScore.commits,
        pullRequests: myScore.pullRequests - targetScore.pullRequests,
        review: myScore.review - targetScore.review,
        issue: myScore.issue - targetScore.issue,
        contribution: myScore.contribution - targetScore.contribution,
        totalActiveDays: myScore.totalActiveDays - targetScore.totalActiveDays,
        currentStreak: myScore.currentStreak - targetScore.currentStreak,
        longestStreak: myScore.longestStreak - targetScore.longestStreak,
      },
    };

    return NextResponse.json({ data: comparison }, { status: 200 });
  } catch (error) {
    console.error("Error comparing scores:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

