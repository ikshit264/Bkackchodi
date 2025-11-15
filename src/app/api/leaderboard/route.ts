import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";

/**
 * GET /api/leaderboard
 * Get global leaderboard (all users sorted by finalScore)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const timeframe = searchParams.get("timeframe") || "alltime"; // daily, weekly, monthly, alltime
    const filter = searchParams.get("filter"); // sector, location, group
    const filterId = searchParams.get("filterId");
    const search = searchParams.get("search"); // username search

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Build where clause based on filters
    const where: { lastUpdatedDate?: { gte: Date }; userId?: { in: string[] } } = {};
    
    // Timeframe filter
    if (timeframe !== "alltime") {
      const now = new Date();
      const startDate = new Date();
      
      if (timeframe === "daily") {
        startDate.setDate(now.getDate() - 1);
      } else if (timeframe === "weekly") {
        startDate.setDate(now.getDate() - 7);
      } else if (timeframe === "monthly") {
        startDate.setMonth(now.getMonth() - 1);
      }
      
      where.lastUpdatedDate = { gte: startDate };
    }
    
    // Filter by sector/group/location
    if (filter === "sector" && filterId) {
      // Get users in this sector
      const sectorMembers = await prisma.groupMembership.findMany({
        where: {
          groupId: filterId,
          leftAt: null,
        },
        select: { userId: true },
      });
      where.userId = { in: sectorMembers.map((m) => m.userId) };
    } else if (filter === "group" && filterId) {
      // Get users in this group
      const groupMembers = await prisma.groupMembership.findMany({
        where: {
          groupId: filterId,
          leftAt: null,
        },
        select: { userId: true },
      });
      where.userId = { in: groupMembers.map((m) => m.userId) };
    } else if (filter === "location" && filterId) {
      // Filter by location (country, city, or region)
      const locationFilter: { country?: string; city?: string; region?: string } = {};
      if (filterId.includes(",")) {
        const [type, value] = filterId.split(",");
        if (type === "country") locationFilter.country = value;
        else if (type === "city") locationFilter.city = value;
        else if (type === "region") locationFilter.region = value;
      }
      
      const locationUsers = await prisma.user.findMany({
        where: locationFilter,
        select: { id: true },
      });
      where.userId = { in: locationUsers.map((u) => u.id) };
    }
    
    // Get all scores with user info, sorted by finalScore descending
    let scores = await prisma.score.findMany({
      where,
      take: limit * 2, // Get more to account for filtering
      skip: offset,
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
            country: true,
            city: true,
            region: true,
          },
        },
      },
    });
    
    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      scores = scores.filter((score) => {
        if (!score.user) return false;
        const userName = (score.user.userName || "").toLowerCase();
        const name = (score.user.name || "").toLowerCase();
        const lastName = (score.user.lastName || "").toLowerCase();
        return (
          userName.includes(searchLower) ||
          name.includes(searchLower) ||
          lastName.includes(searchLower)
        );
      });
    }
    
    // Filter out scores without users and limit results
    const filteredScores = scores.filter((s) => s.user !== null).slice(0, limit);

    // Calculate ranks
    const leaderboard = filteredScores.map((score, index) => ({
      rank: offset + index + 1,
      userId: score.user.id,
      userName: score.user.userName || "",
      name: `${score.user.name} ${score.user.lastName}`.trim(),
      avatar: score.user.avatar,
      email: score.user.email,
      finalScore: score.finalScore,
      githubScore: score.githubScore,
      commits: score.commits,
      pullRequests: score.pullRequests,
      review: score.review,
      issue: score.issue,
      contribution: score.contribution,
      totalActiveDays: score.totalActiveDays,
      currentStreak: score.currentStreak,
      longestStreak: score.longestStreak,
      isMe: score.userId === me.id,
    }));

    // Get current user's rank
    const myScore = await prisma.score.findUnique({ where: { userId: me.id } });
    const usersAboveMe = myScore
      ? await prisma.score.count({
          where: {
            OR: [
              { finalScore: { gt: myScore.finalScore } },
              {
                finalScore: myScore.finalScore,
                lastUpdatedDate: { gt: myScore.lastUpdatedDate },
              },
            ],
          },
        })
      : 0;
    const myRank = myScore ? usersAboveMe + 1 : null;

    return NextResponse.json(
      {
        data: leaderboard,
        myRank,
        myScore: myScore
          ? {
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
            }
          : null,
        pagination: {
          limit,
          offset,
          total: await prisma.score.count({ where }),
        },
        filters: {
          timeframe,
          filter,
          filterId,
          search,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

