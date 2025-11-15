/**
 * Groups API - GET leaderboard for a group
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { leaderboardQuerySchema } from "../../../../../lib/validations/groups";
import type {
  ApiResponse,
  LeaderboardEntry,
  PaginatedResponse,
} from "../../../../../types/groups";

/**
 * GET /api/groups/[groupId]/leaderboard
 * Get leaderboard for a group (paginated, ranks calculated on-the-fly)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);

    // Validate query params
    const queryData: { limit: string; cursor?: string } = {
      limit: searchParams.get("limit") || "50",
    };
    const cursorParam = searchParams.get("cursor");
    if (cursorParam) {
      queryData.cursor = cursorParam;
    }
    
    const queryValidation = leaderboardQuerySchema.safeParse(queryData);

    if (!queryValidation.success) {
      console.error("Leaderboard validation error:", queryValidation.error);
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          details: queryValidation.error.errors,
        },
        { status: 400 }
      );
    }

    const { limit, cursor } = queryValidation.data;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!group) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "Group not found",
          code: "GROUP_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Get all active members' scores, sorted by finalScore descending
    // Include cursor-based pagination
    const whereClause: { groupId: string; user: { groupMemberships: { some: { groupId: string; leftAt: null } } } } = {
      groupId: groupId,
      user: {
        groupMemberships: {
          some: {
            groupId: groupId,
            leftAt: null, // Only active members
          },
        },
      },
    };

    if (cursor) {
      // Get the cursor score to continue from
      const cursorScore = await prisma.groupScore.findUnique({
        where: { id: cursor },
        select: { finalScore: true },
      });

      if (cursorScore) {
        whereClause.OR = [
          { finalScore: { lt: cursorScore.finalScore } },
          {
            finalScore: cursorScore.finalScore,
            id: { gt: cursor },
          },
        ];
      }
    }

    // Fetch scores with user data
    const scores = await prisma.groupScore.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            name: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { finalScore: "desc" },
        { lastUpdatedDate: "desc" },
        { id: "asc" }, // For consistent ordering
      ],
      take: limit + 1, // Fetch one extra to determine hasMore
    });

    const hasMore = scores.length > limit;
    const entries = scores.slice(0, limit);

    // Calculate ranks on-the-fly
    // For accurate ranking, we need to know the position from the full sorted list
    // Since we're paginating, we'll use relative ranking within this page
    // For first page, rank starts at 1, for subsequent pages it's offset by cursor position
    let baseRank = 1;
    if (cursor) {
      // Get count of scores above cursor
      const aboveCount = await prisma.groupScore.count({
        where: {
          groupId: groupId,
          OR: [
            { finalScore: { gt: scores[0]?.finalScore || 0 } },
            {
              finalScore: scores[0]?.finalScore || 0,
              lastUpdatedDate: { gt: scores[0]?.lastUpdatedDate || new Date() },
            },
            {
              finalScore: scores[0]?.finalScore || 0,
              lastUpdatedDate: scores[0]?.lastUpdatedDate || new Date(),
              id: { gt: scores[0]?.id || "" },
            },
          ],
          user: {
            groupMemberships: {
              some: {
                groupId: groupId,
                leftAt: null,
              },
            },
          },
        },
      });
      baseRank = aboveCount + 1;
    }

    const leaderboard: Array<{ rank: number; userId: string; userName: string; finalScore: number }> = entries.map((score, index) => ({
      rank: baseRank + index,
      userId: score.user.id,
      userName: score.user.userName || "",
      name: `${score.user.name} ${score.user.lastName}`.trim(),
      avatar: score.user.avatar,
      finalScore: score.finalScore,
      // New GroupScore fields
      coursesStarted: score.coursesStarted,
      averageCourseCompletion: score.averageCourseCompletion,
      projectsStarted: score.projectsStarted,
      projectsCompleted: score.projectsCompleted,
      totalAiEvaluationScore: score.totalAiEvaluationScore,
      // Legacy fields for compatibility
      commits: 0,
      pullRequests: 0,
      review: 0,
      issue: 0,
      contribution: Math.round(score.totalAiEvaluationScore || 0),
      scoreId: score.id,
    }));

    // Update ranks in database for caching (optional, can be done async)
    // For now, we'll update the displayed entries
    await Promise.all(
      entries.map((score, index) =>
        prisma.groupScore.update({
          where: { id: score.id },
          data: { rank: baseRank + index },
        })
      )
    );

    const response: PaginatedResponse<LeaderboardEntry> = {
      data: leaderboard,
      cursor: hasMore && leaderboard.length > 0 ? leaderboard[leaderboard.length - 1].scoreId || null : null,
      hasMore,
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<LeaderboardEntry>>>(
      { data: response },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json<ApiResponse<never>>(
      {
        error: "Failed to fetch leaderboard",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

