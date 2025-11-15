import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";
import { isAdmin } from "../../../../utils/admin";
import { updateGroupSchema } from "../../../../lib/validations/groups";

const prisma = getPrismaClient();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { groupId } = await params;

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const admin = await isAdmin();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: { select: { id: true, userName: true, name: true } },
        owner: { select: { id: true, userName: true, name: true } },
        members: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, userName: true, name: true, email: true } },
          },
        },
        scores: true,
        courses: {
          where: {
            OR: [
              { userId: me.id }, // User owns the course
              { accesses: { some: { userId: me.id } } }, // User has access via CourseAccess
            ],
            isDeleted: false, // Exclude deleted courses
          },
          select: {
            id: true,
            title: true,
            status: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Check if group is deleted (only admins can see deleted groups)
    if (group.isDeleted && !admin) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Visibility: private group only to owner/members/admin
    if (group.isPrivate && !admin) {
      const isMember = group.members.some((m) => m.userId === me.id);
      const isOwner = group.ownerId === me.id;
      if (!(isMember || isOwner)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isOwner = group.ownerId === me.id;
    const isGroupAdmin = group.members.some((m) => m.userId === me.id && m.role === "ADMIN");

    return NextResponse.json({
      data: {
        ...group,
        // helpful client flags
        __meta: {
          isOwner,
          isGroupAdmin,
          isAdmin: admin,
          meId: me.id,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Fetch group detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update group (admin only for category groups, owner/admin for custom groups)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const admin = await isAdmin();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        type: true,
        ownerId: true,
        members: {
          where: { leftAt: null, userId: me.id },
          select: { role: true },
        },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Check permissions
    const isOwner = group.ownerId === me.id;
    const isGroupAdmin = group.members.some((m) => m.role === "ADMIN" || m.role === "OWNER");

    // Category groups: only admins can edit
    if (group.type === "CATEGORY" && !admin) {
      return NextResponse.json({ error: "Only admins can edit category groups" }, { status: 403 });
    }

    // Custom groups: owner or group admin can edit
    if (group.type === "CUSTOM" && !isOwner && !isGroupAdmin && !admin) {
      return NextResponse.json({ error: "Only owner or admin can edit this group" }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate input
    const validation = updateGroupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    const { name, description, icon, isPrivate } = validation.data;

    // Check if name is being changed and if it already exists
    if (name !== undefined && name.trim() !== group.name) {
      const existingGroup = await prisma.group.findUnique({
        where: { name: name.trim() },
        select: { id: true, isDeleted: true },
      });

      if (existingGroup && !existingGroup.isDeleted && existingGroup.id !== groupId) {
        return NextResponse.json(
          { error: "Group name already exists. Please choose a different name." },
          { status: 409 }
        );
      }
    }

    // Get current group state to check for privacy changes
    const currentGroup = await prisma.group.findUnique({
      where: { id: groupId },
      select: { isPrivate: true, name: true },
    });

    const updateData: { name?: string; description?: string | null; icon?: string | null; isPrivate?: boolean } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (icon !== undefined) updateData.icon = icon?.trim() || null;
    // Category groups must be public
    if (isPrivate !== undefined && group.type === "CUSTOM") {
      updateData.isPrivate = isPrivate;
    }

    let updatedGroup;
    try {
      updatedGroup = await prisma.group.update({
        where: { id: groupId },
        data: updateData,
        include: {
          creator: { select: { id: true, userName: true, name: true } },
          owner: { select: { id: true, userName: true, name: true } },
          members: {
            where: { leftAt: null },
            include: {
              user: { select: { id: true, userName: true, name: true, email: true } },
            },
          },
        },
      });
    } catch (error) {
      // Handle unique constraint violation
      const prismaError = error as { code?: string; meta?: { target?: string[] } };
      if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("name")) {
        return NextResponse.json(
          { error: "Group name already exists. Please choose a different name." },
          { status: 409 }
        );
      }
      throw error;
    }

    // If privacy changed, notify all members
    if (currentGroup && currentGroup.isPrivate !== updatedGroup.isPrivate) {
      const privacyChange = updatedGroup.isPrivate ? "private" : "public";
      
      // Create notifications for all members (except the one who made the change)
      const notifications = updatedGroup.members
        .filter((m) => m.userId !== me.id)
        .map((member) => ({
          recipientUserId: member.userId,
          type: "GROUP_PRIVACY_CHANGED",
          data: {
            groupId: groupId,
            groupName: updatedGroup.name,
            newPrivacy: privacyChange,
            changedBy: me.id,
          },
        }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications,
        });
      }
    }

    return NextResponse.json({ data: updatedGroup, success: true }, { status: 200 });
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Delete group (admin only for category groups, owner for custom groups) - SOFT DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const admin = await isAdmin();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        type: true,
        ownerId: true,
        isDeleted: true,
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Check if already deleted
    if (group.isDeleted) {
      return NextResponse.json({ error: "Group already deleted" }, { status: 400 });
    }

    // Category groups: only admins can delete
    if (group.type === "CATEGORY" && !admin) {
      return NextResponse.json({ error: "Only admins can delete category groups" }, { status: 403 });
    }

    // Custom groups: only owner can delete
    if (group.type === "CUSTOM" && group.ownerId !== me.id && !admin) {
      return NextResponse.json({ error: "Only owner can delete this group" }, { status: 403 });
    }

    // Soft delete: set isDeleted and deletedAt
    await prisma.group.update({
      where: { id: groupId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Notify all members about group deletion
    const members = await prisma.groupMembership.findMany({
      where: {
        groupId,
        leftAt: null,
      },
      select: {
        userId: true,
      },
    });

    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members
          .filter((m) => m.userId !== me.id)
          .map((member) => ({
            recipientUserId: member.userId,
            type: "GROUP_DELETED",
            data: {
              groupId: groupId,
              groupName: group.name || "Group",
              deletedBy: me.id,
            },
          })),
      });
    }

    return NextResponse.json({ success: true, message: "Group deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
