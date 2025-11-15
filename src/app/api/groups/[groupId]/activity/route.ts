import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../../lib/prisma";
import { isAdmin } from "../../../../../utils/admin";

const prisma = getPrismaClient();

/**
 * GET /api/groups/[groupId]/activity
 * Get group activity feed (member joins, course creation, project completions, etc.)
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
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

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
          select: { userId: true },
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

    // Include owner in memberIds if not already included
    const memberIds = group.members.map((m) => m.userId);
    if (group.ownerId && !memberIds.includes(group.ownerId)) {
      memberIds.push(group.ownerId);
    }

    // Get group-related notifications (activities)
    const activityTypes = [
      "GROUP_INVITE",
      "GROUP_MEMBER_JOINED",
      "GROUP_MEMBER_LEFT",
      "GROUP_MEMBER_PROMOTED",
      "GROUP_MEMBER_DEMOTED",
      "GROUP_MEMBER_REMOVED",
      "GROUP_PRIVACY_CHANGED",
      "GROUP_DELETED",
      "GROUP_OWNERSHIP_TRANSFERRED",
      "COURSE_CREATED",
    ];

    // Get notifications for group members related to this group
    const where = {
      recipientUserId: { in: memberIds },
      type: { in: activityTypes },
      data: {
        path: ["groupId"],
        equals: groupId,
      },
    };

    const totalCount = await prisma.notification.count({ where });

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        recipient: {
          select: {
            id: true,
            userName: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Also get course creation activities (courses created in this group)
    const recentCourses = await prisma.course.findMany({
      where: {
        groupId,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        userId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            userName: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Format activities
    const activities = [
      ...notifications.map((notif) => ({
        id: notif.id,
        type: notif.type,
        user: notif.recipient,
        data: notif.data,
        createdAt: notif.createdAt,
        source: "notification",
      })),
      ...recentCourses.map((course) => ({
        id: `course-${course.id}`,
        type: "COURSE_CREATED",
        user: course.user,
        data: {
          courseId: course.id,
          courseTitle: course.title,
          groupId: groupId,
        },
        createdAt: course.createdAt,
        source: "course",
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: activities,
      pagination: {
        page,
        limit,
        totalCount: activities.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Get group activity error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

