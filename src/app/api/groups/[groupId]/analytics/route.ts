import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/groups/[groupId]/analytics
 * Get analytics/comparison for a group
 * Query params: ?userId=<userId> to compare with specific user, or ?top=true for top user
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
    const targetUserId = searchParams.get("userId");
    const compareToTop = searchParams.get("top") === "true";

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify user is member or owner of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, ownerId: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isOwner = group.ownerId === me.id;
    const membership = await prisma.groupMembership.findFirst({
      where: {
        groupId,
        userId: me.id,
        leftAt: null,
      },
    });

    if (!isOwner && !membership) {
      return NextResponse.json(
        { error: "You must be a member or owner of this group" },
        { status: 403 }
      );
    }

    // Get current user's group score
    const myGroupScore = await prisma.groupScore.findUnique({
      where: {
        userId_groupId: {
          userId: me.id,
          groupId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            name: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    if (!myGroupScore) {
      return NextResponse.json(
        {
          error: "You don't have a score in this group yet.",
        },
        { status: 404 }
      );
    }

    let targetGroupScore: typeof myGroupScore | null = null;
    let targetUser: typeof myGroupScore.user | null = null;

    if (compareToTop) {
      // Compare to top user in group
      const topScore = await prisma.groupScore.findFirst({
        where: {
          groupId,
          user: {
            groupMemberships: {
              some: {
                groupId,
                leftAt: null,
              },
            },
          },
        },
        orderBy: [
          { finalScore: "desc" },
          { lastUpdatedDate: "desc" },
        ],
        include: {
          user: {
            select: {
              id: true,
              userName: true,
              name: true,
              lastName: true,
              avatar: true,
              email: true,
            },
          },
        },
      });

      if (topScore) {
        targetGroupScore = topScore;
        targetUser = topScore.user;
      }
    } else if (targetUserId) {
      // Compare to specific user
      const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          userName: true,
          name: true,
          lastName: true,
          avatar: true,
          email: true,
        },
      });

      if (!target) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
      }

      const score = await prisma.groupScore.findUnique({
        where: {
          userId_groupId: {
            userId: targetUserId,
            groupId,
          },
        },
      });

      if (!score) {
        return NextResponse.json(
          {
            error: "Target user doesn't have a score in this group yet",
          },
          { status: 404 }
        );
      }

      targetGroupScore = score;
      targetUser = target;
    } else {
      return NextResponse.json(
        { error: "Either userId or top=true query parameter is required" },
        { status: 400 }
      );
    }

    // Calculate differences
    const comparison = {
      me: {
        user: myGroupScore.user,
        finalScore: myGroupScore.finalScore,
        coursesStarted: myGroupScore.coursesStarted,
        averageCourseCompletion: myGroupScore.averageCourseCompletion,
        projectsStarted: myGroupScore.projectsStarted,
        projectsCompleted: myGroupScore.projectsCompleted,
        totalAiEvaluationScore: myGroupScore.totalAiEvaluationScore,
        rank: myGroupScore.rank,
      },
      target: {
        user: targetUser,
        finalScore: targetGroupScore.finalScore,
        coursesStarted: targetGroupScore.coursesStarted,
        averageCourseCompletion: targetGroupScore.averageCourseCompletion,
        projectsStarted: targetGroupScore.projectsStarted,
        projectsCompleted: targetGroupScore.projectsCompleted,
        totalAiEvaluationScore: targetGroupScore.totalAiEvaluationScore,
        rank: targetGroupScore.rank,
      },
      differences: {
        finalScore: myGroupScore.finalScore - targetGroupScore.finalScore,
        coursesStarted: myGroupScore.coursesStarted - targetGroupScore.coursesStarted,
        averageCourseCompletion:
          myGroupScore.averageCourseCompletion - targetGroupScore.averageCourseCompletion,
        projectsStarted: myGroupScore.projectsStarted - targetGroupScore.projectsStarted,
        projectsCompleted: myGroupScore.projectsCompleted - targetGroupScore.projectsCompleted,
        totalAiEvaluationScore:
          myGroupScore.totalAiEvaluationScore - targetGroupScore.totalAiEvaluationScore,
        rank: (myGroupScore.rank || 0) - (targetGroupScore.rank || 0),
      },
    };

    return NextResponse.json({ data: comparison }, { status: 200 });
  } catch (error) {
    console.error("Error fetching group analytics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

