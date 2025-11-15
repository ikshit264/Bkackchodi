/**
 * Admin API - Groups management
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../utils/admin";
import { prisma } from "../../../../../lib/prisma";

/**
 * GET /api/admin/groups
 * Get all groups with members (admin only)
 */
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const groups = await prisma.group.findMany({
      include: {
        creator: {
          select: {
            id: true,
            userName: true,
            name: true,
          },
        },
        members: {
          where: {
            leftAt: null,
          },
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                name: true,
                email: true,
              },
            },
          },
        },
        scores: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
              },
            },
          },
          orderBy: {
            finalScore: "desc",
          },
        },
        courses: true,
        _count: {
          select: {
            members: {
              where: {
                leftAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: groups }, { status: 200 });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/groups/add-user
 * Add user to group (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, groupId } = body;

    if (!userId || !groupId) {
      return NextResponse.json(
        { error: "userId and groupId are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Check if membership exists
    // Prevent adding the group owner redundantly
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { ownerId: true } });
    if (!group) {
      return NextResponse.json(
        { error: "Group not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    if (group.ownerId && group.ownerId === userId) {
      return NextResponse.json(
        { error: "Owner is always a member and cannot be re-added", code: "OWNER_IMMUTABLE" },
        { status: 400 }
      );
    }
    const existing = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (existing && !existing.leftAt) {
      return NextResponse.json(
        { error: "User is already a member", code: "ALREADY_MEMBER" },
        { status: 400 }
      );
    }

    // Create or reactivate membership
    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.groupMembership.update({
          where: {
            userId_groupId: {
              userId,
              groupId,
            },
          },
          data: {
            leftAt: null,
            joinedAt: new Date(),
          },
        });
      } else {
        await tx.groupMembership.create({
          data: {
            userId,
            groupId,
          },
        });
      }

      // GroupScore will be created by updateGroupScore function with calculated values after transaction
    });

    // Calculate and create/update GroupScore using new calculation method
    try {
      const { updateGroupScore } = await import("../../../../lib/GroupScoreCalculator");
      await updateGroupScore(userId, groupId);
    } catch (error) {
      console.error("Error calculating group score:", error);
      // Don't fail the request if score calculation fails
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error adding user to group:", error);
    return NextResponse.json(
      { error: "Failed to add user to group", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/groups
 * Delete group or remove user from group (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { groupId, userId } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // If userId provided, remove user from group
    if (userId) {
      // Prevent removing the group owner
      const group = await prisma.group.findUnique({ where: { id: groupId }, select: { ownerId: true } });
      if (!group) {
        return NextResponse.json(
          { error: "Group not found", code: "NOT_FOUND" },
          { status: 404 }
        );
      }
      if (group.ownerId && group.ownerId === userId) {
        return NextResponse.json(
          { error: "Owner cannot be removed from the group", code: "OWNER_IMMUTABLE" },
          { status: 400 }
        );
      }
      await prisma.groupMembership.updateMany({
        where: {
          groupId,
          userId,
        },
        data: {
          leftAt: new Date(),
        },
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Otherwise, delete the entire group
    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting group/user:", error);
    return NextResponse.json(
      { error: "Failed to delete", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

