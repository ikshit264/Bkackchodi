import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../../lib/prisma";
import { isAdmin } from "../../../../../utils/admin";

const prisma = getPrismaClient();

/**
 * GET /api/groups/[groupId]/members
 * Get paginated list of group members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;
    const role = searchParams.get("role"); // Filter by role: OWNER, ADMIN, MEMBER

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const admin = await isAdmin();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        isPrivate: true,
        ownerId: true,
        isDeleted: true,
        members: {
          where: { leftAt: null },
          select: { userId: true, role: true },
        },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    if (group.isDeleted && !admin) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Visibility: private group only to owner/members/admin
    if (group.isPrivate && !admin) {
      const isMember = group.members.some((m) => m.userId === me.id);
      const isOwner = group.ownerId === me.id;
      if (!(isMember || isOwner)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const where: { groupId: string; leftAt: null; role?: string } = {
      groupId,
      leftAt: null, // Only active members
    };

    if (role) {
      where.role = role;
    }

    // Get total count
    const totalCount = await prisma.groupMembership.count({ where });

    const memberships = await prisma.groupMembership.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then ADMIN, then MEMBER
        { joinedAt: "asc" }, // Then by join date
      ],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: memberships,
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
    console.error("List group members error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}




