import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../../../lib/prisma";
import { isAdmin } from "../../../../../../utils/admin";
import { manageMemberSchema } from "../../../../../../lib/validations/groups";

const prisma = getPrismaClient();

/**
 * PATCH /api/groups/[groupId]/members/[userId]
 * Update member role (promote/demote) or remove member
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId, userId: targetUserId } = await params;
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const admin = await isAdmin();

    const body = await request.json();
    
    // Validate input
    const validation = manageMemberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    const { action, role } = validation.data;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        type: true,
        ownerId: true,
        isDeleted: true,
        members: {
          where: { leftAt: null },
          select: { userId: true, role: true },
        },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    if (group.isDeleted) {
      return NextResponse.json({ error: "Cannot manage members of deleted group" }, { status: 400 });
    }

    // Check permissions
    const isOwner = group.ownerId === me.id;
    const isGroupAdmin = group.members.some((m) => m.userId === me.id && m.role === "ADMIN");
    const canManage = admin || isOwner || isGroupAdmin;

    if (!canManage) {
      return NextResponse.json({ error: "Only owner or admin can manage members" }, { status: 403 });
    }

    // Check if target user is a member
    const targetMember = group.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      return NextResponse.json({ error: "User is not a member of this group" }, { status: 404 });
    }

    // Can't manage the owner
    if (group.ownerId === targetUserId) {
      return NextResponse.json({ error: "Cannot manage the group owner" }, { status: 400 });
    }

    // Can't manage yourself
    if (me.id === targetUserId) {
      return NextResponse.json({ error: "Cannot manage yourself" }, { status: 400 });
    }

    // Get target user info
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, userName: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (action === "remove") {
      // Remove member (soft delete)
      await prisma.groupMembership.update({
        where: {
          userId_groupId: {
            userId: targetUserId,
            groupId: groupId,
          },
        },
        data: {
          leftAt: new Date(),
        },
      });

      // Notify user
      await prisma.notification.create({
        data: {
          recipientUserId: targetUserId,
          type: "GROUP_MEMBER_REMOVED",
          data: {
            groupId: groupId,
            groupName: group.name,
            removedBy: me.id,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Member removed successfully",
      }, { status: 200 });
    }

    if (action === "promote" || action === "demote") {
      // Validate role
      const newRole = role || (action === "promote" ? "ADMIN" : "MEMBER");
      if (!["ADMIN", "MEMBER"].includes(newRole)) {
        return NextResponse.json({ error: "Invalid role. Must be ADMIN or MEMBER" }, { status: 400 });
      }

      // Can't demote if already at that level
      if (action === "demote" && targetMember.role === "MEMBER") {
        return NextResponse.json({ error: "User is already a member" }, { status: 400 });
      }

      // Can't promote if already admin
      if (action === "promote" && targetMember.role === "ADMIN") {
        return NextResponse.json({ error: "User is already an admin" }, { status: 400 });
      }

      // Update role
      await prisma.groupMembership.update({
        where: {
          userId_groupId: {
            userId: targetUserId,
            groupId: groupId,
          },
        },
        data: {
          role: newRole as "OWNER" | "ADMIN" | "MEMBER",
        },
      });

      // Notify user
      await prisma.notification.create({
        data: {
          recipientUserId: targetUserId,
          type: action === "promote" ? "GROUP_MEMBER_PROMOTED" : "GROUP_MEMBER_DEMOTED",
          data: {
            groupId: groupId,
            groupName: group.name,
            newRole: newRole,
            changedBy: me.id,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Member ${action === "promote" ? "promoted" : "demoted"} successfully`,
        data: {
          userId: targetUserId,
          newRole: newRole,
        },
      }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Manage member error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

