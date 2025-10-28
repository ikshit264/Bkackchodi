import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID required" },
        { status: 400 }
      );
    }

    // Fetch all batches with their projects
    const course = await prisma.course.findFirst({
      where: { id: courseId },
      select: {
        batch: {
          select: {
            id: true,
            projects: {
              select: {
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Flatten all projects from all batches
    const allProjects = course.batch.flatMap((b) => b.projects);
    const total = allProjects.length;

    if (total === 0) {
      return NextResponse.json({
        message: "No projects found for this course",
        data: { total: 0, completed: 0, inProgress: 0, notStarted: 0 },
      });
    }

    // Count projects by status
    const counts = {
      completed: allProjects.filter((p) => p.status === "completed").length,
      inProgress: allProjects.filter((p) => p.status === "in progress").length,
      notStarted: allProjects.filter((p) => p.status === "not started").length,
    };

    // Calculate percentages
    const percentages = {
      completed: ((counts.completed / total) * 100).toFixed(2),
      inProgress: ((counts.inProgress / total) * 100).toFixed(2),
      notStarted: ((counts.notStarted / total) * 100).toFixed(2),
    };

    // // Optional: structured breakdown by batch
    // const batchBreakdown = course.batch.map((b) => ({
    //   batchId: b.id,
    //   totalProjects: b.projects.length,
    //   counts: {
    //     completed: b.projects.filter((p) => p.status === "completed").length,
    //     inProgress: b.projects.filter((p) => p.status === "in progress").length,
    //     notStarted: b.projects.filter((p) => p.status === "not started").length,
    //   },
    // }));

    return NextResponse.json({
      totalProjects: total,
      counts,
      percentages,
    //   batchBreakdown, // breakdown per batch for insight
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
