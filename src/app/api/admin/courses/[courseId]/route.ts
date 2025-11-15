/**
 * Admin API - Get detailed course information
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../../utils/admin";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/admin/courses/[courseId]
 * Get detailed course information (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
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
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        batch: {
          include: {
            projects: {
              orderBy: {
                position: "asc",
              },
            },
          },
          orderBy: {
            number: "asc",
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Calculate course progress
    const totalProjects = course.batch.reduce(
      (sum, batch) => sum + batch.projects.length,
      0
    );
    const completedProjects = course.batch.reduce(
      (sum, batch) =>
        sum +
        batch.projects.filter((p) => p.status === "completed").length,
      0
    );
    const progressPercentage =
      totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

    return NextResponse.json(
      {
        data: {
          ...course,
          progress: {
            totalProjects,
            completedProjects,
            percentage: Math.round(progressPercentage),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching course details:", error);
    return NextResponse.json(
      { error: "Failed to fetch course details", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

