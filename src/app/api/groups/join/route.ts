/**
 * Groups API - POST join group
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { joinGroupSchema } from "../../../../lib/validations/groups";
import type { ApiResponse } from "../../../../types/groups";
import { prisma } from "../../../../../lib/prisma";
import { updateGroupScore } from "../../../../lib/GroupScoreCalculator";

/**
 * POST /api/groups/join
 * Join a group (creates membership and initializes GroupScore)
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
    const validation = joinGroupSchema.safeParse(body);

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

    // Check if group exists and get its privacy/type
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { 
        id: true, 
        isPrivate: true, 
        type: true,
        ownerId: true,
      },
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

    // Check if user can join
    // Public groups/sectors: anyone can join
    // Private groups: only via invitation (handled separately)
    if (group.isPrivate && group.type === "CUSTOM") {
      // Check if user has pending invitation
      const invite = await prisma.groupInvite.findFirst({
        where: {
          groupId: groupId,
          toUserId: dbUser.id,
          status: "PENDING",
        },
      });

      if (!invite && group.ownerId !== dbUser.id) {
        return NextResponse.json<ApiResponse<never>>(
          {
            error: "This is a private group. You need an invitation to join.",
            code: "PRIVATE_GROUP",
          },
          { status: 403 }
        );
      }
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId: dbUser.id,
          groupId: groupId,
        },
      },
    });

    if (existingMembership && !existingMembership.leftAt) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "User is already a member of this group",
          code: "ALREADY_MEMBER",
        },
        { status: 400 }
      );
    }

    // Use transaction to create membership and GroupScore atomically
    await prisma.$transaction(async (tx) => {
      // Create or reactivate membership
      if (existingMembership) {
        // Reactivate by clearing leftAt
        await tx.groupMembership.update({
          where: {
            userId_groupId: {
              userId: dbUser.id,
              groupId: groupId,
            },
          },
          data: {
            leftAt: null,
            joinedAt: new Date(), // Update join date
          },
        });
      } else {
        // Create new membership
        await tx.groupMembership.create({
          data: {
            userId: dbUser.id,
            groupId: groupId,
          },
        });
      }

      // GroupScore will be created/updated by updateGroupScore after transaction
    });

    // Calculate and create/update GroupScore using new calculation method
    try {
      await updateGroupScore(dbUser.id, groupId);
    } catch (error) {
      console.error("Error calculating group score after join:", error);
      // Don't fail the join if score calculation fails
    }

    // Phase 2: Track group/sector join contribution
    try {
      const { trackContribution } = await import("../../../../lib/ContributionService");
      const contributionType = group.type === "CATEGORY" ? "SECTOR_JOINED" : "GROUP_JOINED";
      await trackContribution(
        dbUser.id,
        contributionType,
        { groupId: groupId, groupType: group.type }
      );
    } catch (error) {
      console.error("Error tracking group join contribution:", error);
    }

    // Create activity notification for group members
    try {
      const groupMembers = await prisma.groupMembership.findMany({
        where: {
          groupId,
          leftAt: null,
          userId: { not: dbUser.id }, // Don't notify the person who joined
        },
        select: { userId: true },
      });

      if (groupMembers.length > 0) {
        const user = await prisma.user.findUnique({
          where: { id: dbUser.id },
          select: { userName: true, name: true },
        });

        await prisma.notification.createMany({
          data: groupMembers.map((member) => ({
            recipientUserId: member.userId,
            type: "GROUP_MEMBER_JOINED",
            data: {
              groupId: groupId,
              groupName: group.name || "Group",
              userId: dbUser.id,
              userName: user?.userName || user?.name || "Someone",
            },
          })),
        });
      }
    } catch (error) {
      console.error("Error creating join activity notification:", error);
    }

    return NextResponse.json<ApiResponse<{ success: boolean }>>(
      {
        data: { success: true },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json<ApiResponse<never>>(
      {
        error: "Failed to join group",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

