/**
 * Admin API - Get detailed user information
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../../utils/admin";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/admin/users/[userId]
 * Get detailed user information (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        clerkId: true,
        githubId: true,
        githubOwnerid: true,
        githubToken: true,
        geminiApiKey: true,
        groqApiKey: true,
        name: true,
        lastName: true,
        userName: true,
        email: true,
        avatar: true,
        collegeName: true,
        graduationYear: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
        score: true,
        courses: {
          include: {
            batch: {
              include: {
                projects: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    level: true,
                    position: true,
                  },
                },
              },
            },
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        groupMemberships: {
          include: {
            group: {
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
            },
          },
        },
        groupScores: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            finalScore: "desc",
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: user }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      { error: "Failed to fetch user details", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

