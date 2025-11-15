/**
 * Admin API - Courses management
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../utils/admin";
import { prisma } from "../../../../../lib/prisma";
import { updateGroupScore } from "../../../../lib/GroupScoreCalculator";
import { updateGlobalScore } from "../../../../lib/GlobalScoreCalculator";

/**
 * GET /api/admin/courses
 * Get all courses (admin only)
 */
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const courses = await prisma.course.findMany({
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            name: true,
            email: true,
          },
        },
        batch: {
          include: {
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: courses }, { status: 200 });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/courses
 * Delete a course (admin only)
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
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Failed to delete course", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/courses
 * Update a course (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { courseId, title, status, userId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const updateData: Partial<{ title: string; status: string; userId: string }> = {};
    if (title) updateData.title = title;
    if (status) updateData.status = status;
    if (userId) updateData.userId = userId;

    const course = await prisma.course.update({
      where: { id: courseId },
      data: updateData,
      include: {
        user: true,
        batch: true,
        group: {
          select: {
            id: true,
          },
        },
      },
    });

    // Trigger score recalculation if course is in a group
    // This handles status updates, title changes, etc.
    if (course.groupId && course.userId) {
      try {
        await updateGroupScore(course.userId, course.groupId);
        await updateGlobalScore(course.userId, true);
      } catch (error) {
        console.error("Error recalculating scores after admin course update:", error);
        // Don't fail the request if score calculation fails
      }
    }

    return NextResponse.json({ data: course }, { status: 200 });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "Failed to update course", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

