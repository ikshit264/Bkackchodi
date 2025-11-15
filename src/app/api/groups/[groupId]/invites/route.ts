import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../../lib/prisma";
import { isAdmin } from "../../../../../utils/admin";
import { inviteUserSchema } from "../../../../../lib/validations/groups";

const prisma = getPrismaClient();

// Create invite by query (userName/email)
export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { groupId } = await params;
    const body = await request.json();
    
    // Validate input
    const validation = inviteUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    const { query, role } = validation.data;

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { 
        id: true, 
        name: true,
        isPrivate: true, 
        type: true, 
        ownerId: true, 
        isDeleted: true,
        members: { 
          where: { leftAt: null },
          select: { userId: true, role: true } 
        },
      },
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Check if group is deleted
    if (group.isDeleted) {
      return NextResponse.json({ error: "Cannot invite to deleted group" }, { status: 400 });
    }

    const admin = await isAdmin();
    const isOwner = group.ownerId === me.id;
    const isGroupAdmin = group.members.some((m) => m.userId === me.id && m.role === "ADMIN");
    const isOwnerOrAdmin = admin || isOwner || isGroupAdmin;
    if (!isOwnerOrAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Validate requested role
    const requestedRole = (role as string)?.toUpperCase?.() || "MEMBER";
    if (!["OWNER","ADMIN","MEMBER"].includes(requestedRole)) {
      return NextResponse.json({ error: "Invalid role. Must be OWNER, ADMIN, or MEMBER" }, { status: 400 });
    }
    if (requestedRole === "OWNER" && !isOwner && !admin) {
      return NextResponse.json({ error: "Only current owner or admin can invite a new owner" }, { status: 403 });
    }

    const toUser = await prisma.user.findFirst({
      where: {
        OR: [
          { userName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, userName: true, email: true },
    });
    if (!toUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Prevent inviting the owner
    if (group.ownerId && group.ownerId === toUser.id) {
      return NextResponse.json({ error: "Owner cannot be invited" }, { status: 400 });
    }

    // Check if user is already a member
    const existingMembership = group.members.find((m) => m.userId === toUser.id);
    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member of this group" }, { status: 400 });
    }

    // Only one pending invite per target
    const existing = await prisma.groupInvite.findFirst({ 
      where: { 
        groupId, 
        toUserId: toUser.id, 
        status: "PENDING" 
      } 
    });
    if (existing) return NextResponse.json({ error: "Invite already pending" }, { status: 409 });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const invite = await prisma.groupInvite.create({
      data: { 
        groupId, 
        fromUserId: me.id, 
        toUserId: toUser.id, 
        status: "PENDING",
        role: requestedRole as "OWNER" | "ADMIN" | "MEMBER",
        expiresAt 
      },
    });

    // Get current user info for notification
    const fromUser = await prisma.user.findUnique({
      where: { id: me.id },
      select: { userName: true, name: true },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        recipientUserId: toUser.id,
        type: "GROUP_INVITE",
        data: { 
          inviteId: invite.id, 
          groupId, 
          groupName: group.name || "Group",
          fromUserId: me.id,
          fromUserName: fromUser?.userName || fromUser?.name || "Someone",
          role: requestedRole,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    return NextResponse.json({ 
      data: {
        ...invite,
        toUser: {
          id: toUser.id,
          userName: toUser.userName,
          email: toUser.email,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create group invite error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// List invites (owner/group-admin/admin)
export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { groupId } = await params;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;
    const status = searchParams.get("status"); // Filter by status: PENDING, ACCEPTED, etc.

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, ownerId: true, members: { select: { userId: true, role: true } } },
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const admin = await isAdmin();
    const isOwnerOrAdmin = admin || group.ownerId === me.id || group.members.some((m) => m.userId === me.id && m.role === "ADMIN");
    if (!isOwnerOrAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const where: { groupId: string; status?: string } = { groupId };
    if (status) {
      where.status = status;
    }

    // Get total count
    const totalCount = await prisma.groupInvite.count({ where });

    const invites = await prisma.groupInvite.findMany({
      where,
      include: {
        fromUser: { select: { id: true, userName: true, name: true, email: true } },
        toUser: { select: { id: true, userName: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({ 
      data: invites, 
      meId: me.id,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("List group invites error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


