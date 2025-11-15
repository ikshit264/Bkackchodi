import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { updateCourseAccessSchema } from "../../../../../lib/validations/sharing";
import { GetUserByUserId } from "../../../../../components/actions/user";
import { removeAccess } from "../../../../../lib/SharingService";


// Request a role change for an existing user in a course (OWNER only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId } = await params;
    const body = await request.json();

    const validation = updateCourseAccessSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
        },
        { status: 400 }
      );
    }

    const { targetUserId, newAccess } = validation.data;

    // SYNC_COPY is only for challenges, not regular course sharing
    if (newAccess === "SYNC_COPY") {
      return NextResponse.json(
        { error: "SYNC_COPY access can only be granted through challenges" },
        { status: 400 }
      );
    }

    const user = await GetUserByUserId(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const course = await prisma.course.findUnique({
      where: { id: courseId, isDeleted: false },
      select: { id: true, userId: true, title: true },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // Only OWNER can change roles
    if (course.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Only course owner can change roles" }, { status: 403 });
    }

    // Prevent changing owner's role
    if (course.userId === targetUserId) {
      return NextResponse.json({ error: "Cannot change owner's role" }, { status: 400 });
    }

    // Check if target user has access
    const existingAccess = await prisma.courseAccess.findFirst({
      where: { courseId, userId: targetUserId, isDeleted: false },
      select: { access: true, isDeleted: true },
    });

    if (!existingAccess || existingAccess.isDeleted) {
      return NextResponse.json({ error: "User does not have access to this course" }, { status: 404 });
    }

    // Create a new invite for role change; user must accept to apply
    const alreadyPending = await prisma.courseInvite.findFirst({
      where: { courseId, toUserId: targetUserId, status: "PENDING" },
    });
    if (alreadyPending) {
      return NextResponse.json({ error: "An invite is already pending for this user" }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.courseInvite.create({
      data: { courseId, fromUserId: user.id, toUserId: targetUserId, access: newAccess, expiresAt },
    });

    // Notify target user to accept role change
    const { createNotification } = await import("../../../../../lib/NotificationHelper");
    await createNotification(targetUserId, "COURSE_INVITE", {
      inviteId: invite.id,
      courseId,
      fromUserId: user.id,
      access: newAccess,
      expiresAt,
    });

    return NextResponse.json({ data: invite, success: true }, { status: 200 });
  } catch (error) {
    console.error("Update course access error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Remove user access (OWNER only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { courseId } = await params;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
    }

    const user = await GetUserByUserId(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const course = await prisma.course.findUnique({
      where: { id: courseId, isDeleted: false },
      select: { id: true, userId: true, title: true },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // Only OWNER can remove access
    if (course.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Only course owner can remove access" }, { status: 403 });
    }

    // Prevent removing owner's access
    if (course.userId === targetUserId) {
      return NextResponse.json({ error: "Cannot remove owner's access" }, { status: 400 });
    }

    // Get the access level before deleting
    const existingAccess = await prisma.courseAccess.findFirst({
      where: { courseId, userId: targetUserId, isDeleted: false },
      select: { access: true, isDeleted: true },
    });

    if (!existingAccess || existingAccess.isDeleted) {
      return NextResponse.json({ error: "User does not have access to this course" }, { status: 404 });
    }

    // Check if user has challenges associated with this course
    const challengeParticipants = await prisma.challengeParticipant.findMany({
      where: {
        userId: targetUserId,
        challenge: {
          courseId: courseId,
        },
      },
      include: {
        challenge: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    // If access was COPY, find and soft delete the cloned course
    // Note: SYNC_COPY is only for challenges, handled separately
    if (existingAccess.access === "COPY") {
      // Get challenge course IDs to exclude them
      const challengeCourseIds = challengeParticipants
        .map((p) => p.challengeCourseId)
        .filter((id): id is string => id !== null);

      // Find the cloned course (owned by user, matching title/structure, not a challenge course)
      const sourceCourse = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          batch: {
            select: {
              id: true,
              number: true,
              projects: {
                select: {
                  id: true,
                  position: true,
                },
              },
            },
          },
        },
      });

      if (sourceCourse) {
        // Find user's courses with same title and sourceCourseId
        const clonedCourse = await prisma.course.findFirst({
          where: {
            userId: targetUserId,
            sourceCourseId: courseId,
            isDeleted: false,
            // Exclude challenge courses
            ...(challengeCourseIds.length > 0
              ? {
                  id: { notIn: challengeCourseIds },
                }
              : {}),
          },
        });

        if (clonedCourse) {
          // Soft delete the cloned course
          await prisma.course.update({
            where: { id: clonedCourse.id },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
          console.log(`[REMOVE ACCESS] Soft deleted cloned course ${clonedCourse.id} for user ${targetUserId}`);
        }
      }
    }

    // Remove user from all challenges associated with this course
    if (challengeParticipants.length > 0) {
      const challengeParticipantIds = challengeParticipants.map((p) => p.id);
      await prisma.challengeParticipant.deleteMany({
        where: {
          id: { in: challengeParticipantIds },
        },
      });
      console.log(`[REMOVE ACCESS] Removed user ${targetUserId} from ${challengeParticipants.length} challenge(s)`);
    }

    // Remove CourseAccess using service
    await removeAccess(targetUserId, courseId);

    // Send notification about access removal
    const { createNotification } = await import("../../../../../lib/NotificationHelper");
    await createNotification(targetUserId, "COURSE_ACCESS_REMOVED", {
      courseId,
      courseTitle: course.title,
      removedByUserId: user.id,
      challengesRemoved: challengeParticipants.length > 0,
      challengeNames: challengeParticipants.map((p) => p.challenge.name),
    });

    return NextResponse.json(
      {
        success: true,
        challengesRemoved: challengeParticipants.length,
        challengeNames: challengeParticipants.map((p) => p.challenge.name),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Remove course access error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
