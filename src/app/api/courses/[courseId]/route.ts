import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { updateGroupScore } from "../../../../lib/GroupScoreCalculator";
import { updateGlobalScore } from "../../../../lib/GlobalScoreCalculator";
import { checkChallengeAccess } from "../../../../lib/EnhancedChallengeService";

/**
 * GET /api/courses/[courseId]
 * Get course details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            name: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if this course is part of a challenge
    const challengeParticipant = await prisma.challengeParticipant.findFirst({
      where: {
        challengeCourseId: courseId,
        userId: (await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }))?.id || "",
      },
      include: {
        challenge: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
          },
        },
      },
    });

    // If course is part of a challenge, check access
    if (challengeParticipant) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });

      if (dbUser) {
        const accessCheck = await checkChallengeAccess(dbUser.id, challengeParticipant.challengeId);
        if (!accessCheck.canAccess) {
          return NextResponse.json(
            {
              error: "Challenge Access Restricted",
              message: accessCheck.message,
              challengeId: challengeParticipant.challengeId,
              challengeName: challengeParticipant.challenge.name,
            },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({ data: course, success: true }, { status: 200 });
  } catch (error) {
    console.error("Get course error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/courses/[courseId]
 * Update course (group assignment)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get course and verify ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId, isDeleted: false },
      select: {
        userId: true,
        groupId: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden: Only course owner can edit" }, { status: 403 });
    }

    const body = await request.json();
    const { groupId } = body;

    // Validate group membership if groupId provided
    if (groupId) {
      const groupMembership = await prisma.groupMembership.findFirst({
        where: {
          groupId,
          userId: dbUser.id,
          leftAt: null,
        },
      });

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { ownerId: true },
      });

      const isOwner = group?.ownerId === dbUser.id;
      const isMember = Boolean(groupMembership);

      if (!isOwner && !isMember) {
        return NextResponse.json(
          { error: "You must be a member or owner of the group" },
          { status: 403 }
        );
      }
    }

    // If groupId not provided, use Global group
    let finalGroupId = groupId;
    if (!finalGroupId) {
      const globalGroup = await prisma.group.findUnique({
        where: { name: "Global" },
        select: { id: true },
      });
      if (globalGroup) {
        finalGroupId = globalGroup.id;
      }
    }

    const oldGroupId = course.groupId;

    // Update course
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(finalGroupId && {
          group: {
            connect: { id: finalGroupId },
          },
        }),
        ...(finalGroupId === null && {
          group: {
            disconnect: true,
          },
        }),
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Recalculate scores for old and new groups
    try {
      if (oldGroupId) {
        await updateGroupScore(dbUser.id, oldGroupId);
      }
      if (updatedCourse.groupId) {
        await updateGroupScore(dbUser.id, updatedCourse.groupId);
      }
      await updateGlobalScore(dbUser.id, true);
    } catch (error) {
      console.error("Error recalculating scores:", error);
    }

    return NextResponse.json({ data: updatedCourse, success: true }, { status: 200 });
  } catch (error) {
    console.error("Update course error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[courseId]
 * Soft delete course (GitHub-style: requires confirmation)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get course and verify ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId, isDeleted: false },
      select: {
        id: true,
        userId: true,
        title: true,
        groupId: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden: Only course owner can delete" }, { status: 403 });
    }

    // Soft delete course and handle related sharing records
    await prisma.course.update({
      where: { id: courseId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Handle course deletion in sharing service (soft delete access records, cancel invites, clear sourceCourseId)
    try {
      const { handleCourseDeletion } = await import("../../../../lib/SharingService");
      await handleCourseDeletion(courseId);
    } catch (error) {
      console.error("Error handling course deletion in sharing service:", error);
    }

    // Recalculate scores
    try {
      if (course.groupId) {
        await updateGroupScore(dbUser.id, course.groupId);
      }
      if (course.sectorId) {
        await updateGroupScore(dbUser.id, course.sectorId);
      }
      await updateGlobalScore(dbUser.id, true);
    } catch (error) {
      console.error("Error recalculating scores after deletion:", error);
    }

    return NextResponse.json({ success: true, message: "Course deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete course error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


