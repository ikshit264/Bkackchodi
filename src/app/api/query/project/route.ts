import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";
import { updateGroupScore } from "../../../../lib/GroupScoreCalculator";
import { updateGlobalScore } from "../../../../lib/GlobalScoreCalculator";

const prisma = getPrismaClient();

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not Signed In" }, { status: 401 });
    }

    const body = await req.json();
    const {
      batchId,
      title,
      description,
      level,
      status,
      learningObjectives,
      steps,
    } = body;

    if (
      !batchId ||
      !title ||
      !description ||
      !level ||
      !status ||
      !learningObjectives
    ) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    // Security: Verify user is owner of the course
    // Note: COPY creates owned courses, so users with COPY access are owners of their cloned course
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        course: {
          select: {
            id: true,
            userId: true,
            groupId: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    // Verify access
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const isOwner = dbUser.id === batch.course.userId;
    if (!isOwner) {
      // Only course owner can create projects
      // COPY access creates owned courses, so users with COPY access are owners
      return NextResponse.json({ error: "Forbidden: only course owner can create projects" }, { status: 403 });
    }

    const newProject = await prisma.project.create({
      data: {
        title,
        description,
        level,
        status,
        batchId,
        learningObjectives,
        steps: steps || null,
      },
      include: {
        batch: {
          include: {
            course: {
              select: {
                userId: true,
                groupId: true,
              },
            },
          },
        },
      },
    });

    // Trigger score recalculation if project/course is associated with a group
    if (newProject.batch?.course?.groupId && newProject.batch.course.userId) {
      try {
        // Recalculate group score for this user
        await updateGroupScore(
          newProject.batch.course.userId,
          newProject.batch.course.groupId
        );

        // Update global score
        await updateGlobalScore(newProject.batch.course.userId, true);
      } catch (error) {
        console.error("Error recalculating scores after project creation:", error);
        // Don't fail the request if score calculation fails
      }
    }

    return NextResponse.json({ project: newProject }, { status: 201 });
  } catch (error) {
    console.error("Error adding project:", error);
    return NextResponse.json(
      { error: "Failed to add project" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not Signed In" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        month: {
          course: {
            user: {
              clerkId: user.id,
            },
          },
        },
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Error occurred while fetching projects" },
      { status: 500 }
    );
  }
}

// :TODO update kaise hoga ye dheakna hai; 
export async function PATCH(req : NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Not Signed In" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, updatedFields } = body;

    if (!projectId || !updatedFields) {
      return NextResponse.json(
        { error: "Project ID and updated fields are required" },
        { status: 400 }
      );
    }

    // Get existing project to check for old evaluation score (for re-evaluation)
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        batch: {
          include: {
            course: {
              select: {
                userId: true,
                groupId: true,
              },
            },
          },
        },
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Security: Verify user is owner of the course (only OWNER can edit projects)
    // COPY access creates owned courses, READ_ONLY access is read-only
    const courseUserId = existingProject.batch?.course?.userId;
    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const isOwner = dbUser.id === courseUserId;
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: only course owner can edit projects" }, { status: 403 });
    }

    // Extract AI evaluation score from GithubData if it's being updated
    let aiEvaluationScore: number | null = null;
    let evaluatedAt: Date | null = null;
    // Store old score for re-evaluation (unused but kept for potential future use)
    // const oldEvaluationScore = existingProject.aiEvaluationScore;

    if (updatedFields.GithubData) {
      try {
        const githubData =
          typeof updatedFields.GithubData === "string"
            ? JSON.parse(updatedFields.GithubData)
            : updatedFields.GithubData;

        // Extract final_score from evaluation result
        if (githubData && typeof githubData === "object") {
          if (githubData["Final Score"] !== undefined) {
            aiEvaluationScore = parseFloat(githubData["Final Score"]);
          } else if (githubData.final_score !== undefined) {
            aiEvaluationScore = parseFloat(githubData.final_score);
          } else if (githubData.finalScore !== undefined) {
            aiEvaluationScore = parseFloat(githubData.finalScore);
          }

          // Set evaluatedAt if score is found and project is being marked as completed
          if (aiEvaluationScore !== null && !isNaN(aiEvaluationScore)) {
            evaluatedAt = new Date();
            // If status is not explicitly set, mark as completed if evaluation exists
            if (!updatedFields.status) {
              updatedFields.status = "completed";
            }
          }
        }
      } catch (error) {
        console.error("Error parsing GithubData:", error);
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...updatedFields };
    if (aiEvaluationScore !== null) {
      updateData.aiEvaluationScore = aiEvaluationScore;
    }
    if (evaluatedAt !== null) {
      updateData.evaluatedAt = evaluatedAt;
    }

    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: updateData,
      include: {
        batch: {
          include: {
            course: {
              select: {
                userId: true,
                groupId: true,
              },
            },
          },
        },
      },
    });

    // Trigger score recalculation if project/course is associated with a group
    // This should happen on ANY update (status change, evaluation, etc.)
    // For re-evaluation: The GroupScoreCalculator will handle the difference automatically
    // (it recalculates from scratch, so old score is removed and new one is added)
    if (updatedProject.batch?.course?.groupId && updatedProject.batch.course.userId) {
      try {
        // Recalculate group score for this user
        // This handles re-evaluation correctly because it recalculates from scratch
        await updateGroupScore(
          updatedProject.batch.course.userId,
          updatedProject.batch.course.groupId
        );

        // Update global score (force update since this is a direct action)
        await updateGlobalScore(updatedProject.batch.course.userId, true);

        // Phase 1: Check and award badges when project is completed
        // Phase 2: Track contributions
        if (updatedProject.status === "completed") {
          try {
            const { checkAndAwardBadges } = await import("../../../../lib/BadgeService");
            const result = await checkAndAwardBadges(updatedProject.batch.course.userId);
            
            // Track project completion contribution
            const { trackContribution } = await import("../../../../lib/ContributionService");
            await trackContribution(
              updatedProject.batch.course.userId,
              "PROJECT_COMPLETED",
              { projectId: updatedProject.id, projectTitle: updatedProject.title }
            );
            
            // Track badge contributions if any were awarded
            if (result.awardedBadges.length > 0) {
              for (const badgeId of result.awardedBadges) {
                await trackContribution(
                  updatedProject.batch.course.userId,
                  "BADGE_EARNED",
                  { badgeId }
                );
              }
              
              // Phase 2: Update challenge progress for badge earned
              try {
                const { autoUpdateChallengeProgress } = await import("../../../../lib/ChallengeService");
                await autoUpdateChallengeProgress(updatedProject.batch.course.userId, "BADGE_EARNED");
              } catch (error) {
                console.error("Error updating challenge progress for badge:", error);
              }
            }
            
            // Phase 2: Update challenge progress for project completed
            try {
              const { autoUpdateChallengeProgress } = await import("../../../../lib/ChallengeService");
              await autoUpdateChallengeProgress(updatedProject.batch.course.userId, "PROJECT_COMPLETED");
              
              // Check if course is now completed (all projects done)
              const course = await prisma.course.findUnique({
                where: { id: updatedProject.batch.courseId },
                include: {
                  batch: {
                    include: {
                      projects: true,
                    },
                  },
                },
              });
              
              if (course) {
                const allProjects = course.batch.flatMap((b) => b.projects);
                const allCompleted = allProjects.every((p) => p.status === "completed");
                
                if (allCompleted && course.status !== "completed") {
                  // Update course status to completed
                  await prisma.course.update({
                    where: { id: course.id },
                    data: { status: "completed" },
                  });
                  
                  // Trigger course completion challenge update
                  await autoUpdateChallengeProgress(updatedProject.batch.course.userId, "COURSE_COMPLETED");
                }
              }
            } catch (error) {
              console.error("Error updating challenge progress for project:", error);
            }
          } catch (error) {
            console.error("Error checking badges/tracking contributions after project completion:", error);
            // Don't fail the request if badge check fails
          }
        } else if (updatedProject.status !== "not started" && body.status === "not started") {
          // Track project started (when status changes from not started to something else)
          try {
            const { trackContribution } = await import("../../../../lib/ContributionService");
            await trackContribution(
              updatedProject.batch.course.userId,
              "PROJECT_STARTED",
              { projectId: updatedProject.id, projectTitle: updatedProject.title }
            );
          } catch (error) {
            console.error("Error tracking project started:", error);
          }
        }
      } catch (error) {
        console.error("Error recalculating scores after project update:", error);
        // Don't fail the request if score calculation fails
      }
    }

    return NextResponse.json({ project: updatedProject }, { status: 200 });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Error occurred while updating project" },
      { status: 500 }
    );
  }
}
