/**
 * Admin API - Get analytics data
 */
import { NextResponse } from "next/server";
import { isAdmin } from "../../../../utils/admin";
import { prisma } from "../../../../../lib/prisma";

/**
 * GET /api/admin/analytics
 * Get platform analytics (admin only)
 */
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    // Get all statistics
    const [
      totalUsers,
      totalCourses,
      totalGroups,
      totalProjects,
      activeUsers,
      totalScores,
      topUsers,
      recentUsers,
      coursesByStatus,
      groupsWithMembers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.group.count(),
      prisma.project.count(),
      prisma.user.count({
        where: {
          score: {
            lastUpdatedDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      }),
      prisma.score.count(),
      prisma.score.findMany({
        take: 10,
        orderBy: {
          finalScore: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              userName: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          userName: true,
          name: true,
          email: true,
          createdAt: true,
          score: true,
        },
      }),
      prisma.course.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
      prisma.group.findMany({
        include: {
          _count: {
            select: {
              members: {
                where: {
                  leftAt: null,
                },
              },
              courses: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    // Calculate average score
    const avgScoreData = await prisma.score.aggregate({
      _avg: {
        finalScore: true,
        commits: true,
        pullRequests: true,
        contribution: true,
      },
    });

    return NextResponse.json(
      {
        data: {
          overview: {
            totalUsers,
            totalCourses,
            totalGroups,
            totalProjects,
            activeUsers,
            totalScores,
            averageScore: Math.round(avgScoreData._avg.finalScore || 0),
            averageCommits: Math.round(avgScoreData._avg.commits || 0),
            averagePRs: Math.round(avgScoreData._avg.pullRequests || 0),
            averageContributions: Math.round(
              avgScoreData._avg.contribution || 0
            ),
          },
          topUsers,
          recentUsers,
          coursesByStatus: coursesByStatus.reduce(
            (acc, item) => ({
              ...acc,
              [item.status]: item._count.status,
            }),
            {}
          ),
          groupsWithMembers,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

