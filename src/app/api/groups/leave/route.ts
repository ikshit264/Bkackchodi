/**
 * Groups API - POST leave group
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { leaveGroupSchema } from "../../../../lib/validations/groups";
import type { ApiResponse } from "../../../../types/groups";
import { prisma } from "../../../../../lib/prisma";

/**
 * POST /api/groups/leave
 * Leave a group (soft delete by setting leftAt timestamp)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = leaveGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "Invalid input. groupId is required and must be a valid UUID.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { groupId } = validation.data;

    // Get user from DB
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
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

    // Check if membership exists
    const membership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId: dbUser.id,
          groupId: groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "User is not a member of this group",
          code: "NOT_MEMBER",
        },
        { status: 404 }
      );
    }

    if (membership.leftAt) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "User has already left this group",
          code: "ALREADY_LEFT",
        },
        { status: 400 }
      );
    }

    // Get group info for activity notification
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        members: {
          where: { leftAt: null, userId: { not: dbUser.id } },
          select: { userId: true },
        },
      },
    });

    // Soft delete by setting leftAt
    await prisma.groupMembership.update({
      where: {
        userId_groupId: {
          userId: dbUser.id,
          groupId: groupId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    // Create activity notification for remaining members
    if (group && group.members.length > 0) {
      const user = await prisma.user.findUnique({
        where: { id: dbUser.id },
        select: { userName: true, name: true },
      });

      await prisma.notification.createMany({
        data: group.members.map((member) => ({
          recipientUserId: member.userId,
          type: "GROUP_MEMBER_LEFT",
          data: {
            groupId: groupId,
            groupName: group.name || "Group",
            userId: dbUser.id,
            userName: user?.userName || user?.name || "Someone",
          },
        })),
      });
    }

    return NextResponse.json<ApiResponse<{ success: boolean }>>(
      {
        data: { success: true },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error leaving group:", error);
    return NextResponse.json<ApiResponse<never>>(
      {
        error: "Failed to leave group",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

