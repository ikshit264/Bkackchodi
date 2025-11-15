/**
 * Groups API - GET user's groups with scores and rankings
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { ApiResponse, UserGroupWithScore } from "../../../../../types/groups";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/groups/user/[userId]
 * Get all groups a user belongs to, with group scores/rankings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    const { userId: paramUserId } = await params;

    // Users can only view their own groups (unless admin, but we'll keep it simple for now)
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Get user from DB by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "User not found in database",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Verify the requested userId matches (or is admin - simplified for now)
    // In production, you might want to allow admins to view any user's groups
    let targetUserId = dbUser.id;

    if (paramUserId !== dbUser.id && paramUserId !== clerkUserId) {
      // Allow if paramUserId is the user's DB id or Clerk id
      const paramDbUser = await prisma.user.findUnique({
        where: { id: paramUserId },
        select: { id: true, clerkId: true },
      });

      if (!paramDbUser || paramDbUser.clerkId !== clerkUserId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            error: "Forbidden - Cannot view other user's groups",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      targetUserId = paramDbUser.id;
    } else if (paramUserId === dbUser.id) {
      targetUserId = dbUser.id;
    }

    // Get user's active group memberships
    const memberships = await prisma.groupMembership.findMany({
      where: {
        userId: targetUserId,
        leftAt: null, // Only active memberships
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            creatorId: true,
            createdAt: true,
            updatedAt: true,
            courses: {
              where: {
                OR: [
                  { userId: targetUserId }, // User owns the course
                  { accesses: { some: { userId: targetUserId } } }, // User has access via CourseAccess
                ],
              },
              select: {
                id: true,
                title: true,
                status: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 5,
            },
          },
        },
      },
    });

    // Get all group scores for this user
    const groupScores = await prisma.groupScore.findMany({
      where: {
        userId: targetUserId,
        groupId: {
          in: memberships.map((m) => m.groupId),
        },
      },
    });

    // Create a map of groupId -> GroupScore for quick lookup
    const scoreMap = new Map(
      groupScores.map((score) => [score.groupId, score])
    );

    // Format response
    const userGroups: UserGroupWithScore[] = memberships.map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
      description: membership.group.description,
      creatorId: membership.group.creatorId,
      createdAt: membership.group.createdAt,
      updatedAt: membership.group.updatedAt,
      courses: membership.group.courses || [],
      groupScore: scoreMap.get(membership.groupId) || null,
      membership: {
        id: membership.id,
        userId: membership.userId,
        groupId: membership.groupId,
        joinedAt: membership.joinedAt,
        leftAt: membership.leftAt,
      },
    }));

    return NextResponse.json<ApiResponse<UserGroupWithScore[]>>(
      { data: userGroups },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user groups:", error);
    return NextResponse.json<ApiResponse<never>>(
      {
        error: "Failed to fetch user groups",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

