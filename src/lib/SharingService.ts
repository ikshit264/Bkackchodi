/**
 * Sharing Service
 * Handles course sharing, cloning, and access management
 */

import { prisma } from "./prisma";
import { CourseAccessLevel } from "@prisma/client";
import { createRepo, deleteRepo } from "../utils/github/GithubRepo";
import { CreateProject, createProjectWithIssue } from "../utils/github/GithubProjectBackchodi";
import { ProgressCallback, createProgressUpdate } from "../utils/github/progressTracker";

export interface CloneCourseOptions {
  userId: string;
  sourceCourseId: string;
  createGitHubRepos?: boolean;
  retryOnFailure?: boolean;
  onProgress?: ProgressCallback;
}

export interface CourseAccessContext {
  userId: string;
  courseId: string;
  accessLevel: "OWNER" | CourseAccessLevel | null;
  canAccess: boolean;
}

export interface SourceCourseProgress {
  sourceCourseId: string | null;
  sourceTitle: string | null;
  projects: Array<{
    projectId: string;
    title: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    progress: number;
  }>;
}

/**
 * Clone a course for a user
 * Two-phase approach: Course in transaction, GitHub outside with rollback
 */
export async function cloneCourse(options: CloneCourseOptions): Promise<string> {
  const { userId, sourceCourseId, createGitHubRepos = true, retryOnFailure = true, onProgress } = options;

  // 1. Check if already cloned
  const existing = await findClonedCourse(userId, sourceCourseId);
  if (existing) return existing;

  // 2. Load source course
  const source = await prisma.course.findUnique({
    where: { id: sourceCourseId, isDeleted: false },
    include: { batch: { include: { projects: true } } },
  });
  if (!source) throw new Error("Source course not found");

  // 3. Get user's GitHub info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubId: true, clerkId: true },
  });

  // 4. Phase 1: Clone course in transaction (with increased timeout for large courses)
  const clonedCourse = await prisma.$transaction(
    async (tx) => {
      return await tx.course.create({
        data: {
          title: source.title,
          status: source.status,
          userId,
          sourceCourseId: sourceCourseId,
          batch: {
            create: source.batch.map((b) => ({
              number: b.number,
              status: b.status,
              projects: {
                create: b.projects.map((p) => ({
                  title: p.title,
                  description: p.description,
                  level: p.level,
                  status: "not started", // Always start as "not started" for cloned projects
                  position: p.position,
                  learningObjectives: p.learningObjectives,
                  steps: Array.isArray(p.steps)
                    ? (p.steps as any[]).map((s: any) => ({
                        ...s,
                        issueId: null,
                        itemId: null,
                      }))
                    : [],
                })),
              },
            })),
          },
        },
        include: { batch: { include: { projects: true } } },
      });
    },
    {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
      timeout: 30000, // Maximum time the transaction can run (30 seconds)
    }
  );

  // 5. Phase 2: Create GitHub repos (outside transaction)
  if (createGitHubRepos && user?.githubId && user?.clerkId) {
    const githubRepos: Array<{ batchId: string; projectId: string; repoName: string }> = [];
    let githubFailed = false;

    // Helper to limit concurrency
    async function limitConcurrency<T>(
      tasks: Array<() => Promise<T>>,
      limit: number
    ): Promise<T[]> {
      const results: T[] = [];
      const executing: Promise<void>[] = [];

      for (const task of tasks) {
        const promise = task().then(result => {
          results.push(result);
          executing.splice(executing.indexOf(promise), 1);
        });
        executing.push(promise);

        if (executing.length >= limit) {
          await Promise.race(executing);
        }
      }

      await Promise.all(executing);
      return results;
    }

    const createGitHubResources = async (): Promise<void> => {
      // Calculate total operations for progress tracking
      const totalBatches = clonedCourse.batch.length;
      let totalProjects = 0;
      let totalIssues = 0;
      clonedCourse.batch.forEach(batch => {
        batch.projects.forEach(project => {
          if (project.status?.toLowerCase() !== "not started") {
            totalProjects++;
            const steps = Array.isArray(project.steps) ? (project.steps as any[]) : [];
            totalIssues += steps.length;
          }
        });
      });

      const totalOperations = totalBatches + totalProjects + totalIssues;
      let currentOperation = 0;

      // OPTIMIZATION: Create all GitHub projects in parallel
      onProgress?.(createProgressUpdate("creating_project", "Creating GitHub projects for batches...", 0, totalOperations));
      
      const batchProjectPromises = clonedCourse.batch.map(async (batch) => {
        try {
          const projectId = await CreateProject(
            user.githubId!,
            user.clerkId!,
            "user",
            `${clonedCourse.title}-Batch-${batch.number}`
          );

          if (projectId && typeof projectId === "string") {
            await prisma.batch.update({
              where: { id: batch.id },
              data: { githubProjectId: projectId },
            });
            currentOperation++;
            onProgress?.(createProgressUpdate("project_created", `Batch ${batch.number} project created`, currentOperation, totalOperations));
            return { batchId: batch.id, projectId };
          }
          return { batchId: batch.id, projectId: null };
        } catch (error) {
          console.error(`[CLONE] Failed to create GitHub project for batch ${batch.id}:`, error);
          return { batchId: batch.id, projectId: null };
        }
      });

      const batchProjects = await Promise.allSettled(batchProjectPromises);
      const projectMap = new Map<string, string>();
      batchProjects.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.projectId) {
          projectMap.set(clonedCourse.batch[index].id, result.value.projectId);
        }
      });

      // OPTIMIZATION: Create all repos and issues in parallel (with concurrency limit)
      onProgress?.(createProgressUpdate("creating_repo", "Creating repositories and issues...", currentOperation, totalOperations));
      
      const allProjectTasks: Array<() => Promise<void>> = [];

      for (const batch of clonedCourse.batch) {
        const githubProjectId = projectMap.get(batch.id);
        if (!githubProjectId) continue;

        for (const project of batch.projects) {
          if (project.status?.toLowerCase() !== "not started") {
            allProjectTasks.push(async () => {
              try {
                // Create repo
                const repoName = await createRepo(
                  user.clerkId!,
                  project.id,
                  project.title,
                  `Replicated from ${source.title}`
                );

                await prisma.project.update({
                  where: { id: project.id },
                  data: { githubRepo: repoName as any },
                });

                githubRepos.push({ batchId: batch.id, projectId: project.id, repoName });
                currentOperation++;
                onProgress?.(createProgressUpdate("repo_created", `Repository created: ${repoName}`, currentOperation, totalOperations));

                const steps = Array.isArray(project.steps) ? (project.steps as any[]) : [];
                
                // OPTIMIZATION: Create all issues for this project in parallel
                const issuePromises = steps.map(async (step, i) => {
                  const issueTitle = step?.stepTitle?.stepTitle || step?.stepTitle || `${project.title} - Step ${i + 1}`;
                  const issueBody = step?.stepTitle?.description || "";

                  const result = await createProjectWithIssue({
                    owner: user.githubId!,
                    userId: user.clerkId!,
                    repoName,
                    ownerType: "user",
                    projectId: githubProjectId,
                    issueTitle,
                    issueBody,
                    issueLabel: "task",
                  });

                  if (result?.success && result.issueId && result.itemId) {
                    currentOperation++;
                    onProgress?.(createProgressUpdate("issue_created", `Issue ${i + 1}/${steps.length} created`, currentOperation, totalOperations));
                    return {
                      index: i,
                      step: {
                        ...steps[i],
                        issueId: result.issueId,
                        itemId: result.itemId,
                        status: "not started",
                      }
                    };
                  }
                  return { index: i, step: steps[i] };
                });

                const issueResults = await Promise.allSettled(issuePromises);
                const updatedSteps = [...steps];
                issueResults.forEach((result) => {
                  if (result.status === 'fulfilled') {
                    updatedSteps[result.value.index] = result.value.step;
                  }
                });

                await prisma.project.update({
                  where: { id: project.id },
                  data: { steps: updatedSteps },
                });
              } catch (error) {
                console.error(`[CLONE] Failed to create repo/issues for project ${project.id}:`, error);
                throw error;
              }
            });
          }
        }
      }

      // OPTIMIZATION: Process projects with concurrency limit (5 at a time to respect GitHub rate limits)
      await limitConcurrency(allProjectTasks, 5);
      
      onProgress?.(createProgressUpdate("completed", "All GitHub resources created successfully", totalOperations, totalOperations));
    };

    try {
      await createGitHubResources();
    } catch (error) {
      console.error("[CLONE] GitHub creation failed:", error);
      githubFailed = true;
    }

    // Retry once if enabled
    if (githubFailed && retryOnFailure) {
      console.log("[CLONE] Retrying GitHub creation after 2 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      githubFailed = false;
      try {
        await createGitHubResources();
      } catch (retryError) {
        console.error("[CLONE] Retry also failed, rolling back...");
        githubFailed = true;
      }
    }

    // Rollback if still failed
    if (githubFailed) {
      console.error("[CLONE] Rolling back course clone due to GitHub failure...");

      for (const repo of githubRepos) {
        try {
          await deleteRepo(user.clerkId!, repo.repoName);
        } catch (deleteError) {
          console.error(`[CLONE] Failed to delete repo ${repo.repoName}:`, deleteError);
        }
      }

      await prisma.course.update({
        where: { id: clonedCourse.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      throw new Error("Course cloning failed: GitHub repositories could not be created. Please try again.");
    }
  }

  return clonedCourse.id;
}

/**
 * Find cloned course using sourceCourseId
 */
export async function findClonedCourse(userId: string, sourceCourseId: string): Promise<string | null> {
  const clonedCourse = await prisma.course.findFirst({
    where: {
      userId,
      sourceCourseId,
      isDeleted: false,
    },
    select: { id: true },
  });

  return clonedCourse?.id || null;
}

/**
 * Grant access to a course
 */
export async function grantAccess(userId: string, courseId: string, access: CourseAccessLevel): Promise<void> {
  // Check if access already exists
  const existing = await prisma.courseAccess.findFirst({
    where: { courseId, userId, isDeleted: false },
  });

  if (existing) {
    await prisma.courseAccess.update({
      where: { id: existing.id },
      data: { access, isDeleted: false, deletedAt: null },
    });
  } else {
    await prisma.courseAccess.create({
      data: { courseId, userId, access },
    });
  }
}

/**
 * Remove access (soft delete)
 */
export async function removeAccess(userId: string, courseId: string): Promise<void> {
  // Get access before removing to check if it was SYNC_COPY
  const access = await prisma.courseAccess.findFirst({
    where: { courseId, userId, isDeleted: false },
    select: { access: true },
  });

  await prisma.courseAccess.updateMany({
    where: { courseId, userId, isDeleted: false },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  // Note: SYNC_COPY is only used for challenges, not regular course sharing
}

/**
 * Check if user has access
 */
export async function checkAccess(userId: string, courseId: string): Promise<CourseAccessLevel | null> {
  const access = await prisma.courseAccess.findFirst({
    where: {
      courseId,
      userId,
      isDeleted: false,
    },
    select: { access: true },
  });

  return access?.access || null;
}

/**
 * Ensure user has SYNC_COPY access
 */
export async function ensureSyncCopyAccess(userId: string, courseId: string): Promise<void> {
  const existing = await prisma.courseAccess.findFirst({
    where: { courseId, userId, isDeleted: false },
  });

  if (existing) {
    if (existing.access === "READ_ONLY" || existing.access === "COPY") {
      await prisma.courseAccess.update({
        where: { id: existing.id },
        data: { access: "SYNC_COPY" },
      });
    }
  } else {
    await prisma.courseAccess.create({
      data: { courseId, userId, access: "SYNC_COPY" },
    });
  }
}

/**
 * Downgrade SYNC_COPY to COPY
 */
export async function downgradeSyncCopyToCopy(userId: string, courseId: string): Promise<void> {
  await prisma.courseAccess.updateMany({
    where: {
      courseId,
      userId,
      access: "SYNC_COPY",
      isDeleted: false,
    },
    data: { access: "COPY" },
  });
}

/**
 * Handle course deletion - soft delete all related records
 */
export async function handleCourseDeletion(courseId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Soft delete all access records
    await tx.courseAccess.updateMany({
      where: { courseId, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Cancel pending invites
    await tx.courseInvite.updateMany({
      where: { courseId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    // Remove sourceCourseId from cloned courses (they become standalone)
    await tx.course.updateMany({
      where: { sourceCourseId: courseId },
      data: { sourceCourseId: null },
    });

    // Note: SYNC_COPY notifications are only for challenges
  });
}

/**
 * Validate course access
 */
export async function validateCourseAccess(
  userId: string,
  courseId: string
): Promise<{
  canAccess: boolean;
  reason?: string;
  accessLevel?: CourseAccessLevel | "OWNER";
}> {
  const course = await prisma.course.findUnique({
    where: { id: courseId, isDeleted: false },
    select: { userId: true },
  });

  if (!course) {
    return { canAccess: false, reason: "Course not found" };
  }

  if (course.userId === userId) {
    return { canAccess: true, accessLevel: "OWNER" };
  }

  const access = await checkAccess(userId, courseId);
  if (access) {
    return { canAccess: true, accessLevel: access };
  }

  const challengeParticipant = await prisma.challengeParticipant.findFirst({
    where: {
      userId,
      challengeCourseId: courseId,
      status: { in: ["JOINED", "IN_PROGRESS", "COMPLETED"] },
    },
    include: {
      challenge: {
        select: { status: true },
      },
    },
  });

  if (challengeParticipant) {
    if (
      challengeParticipant.challenge.status === "DRAFT" ||
      challengeParticipant.challenge.status === "ACTIVE" ||
      challengeParticipant.challenge.status === "COMPLETED"
    ) {
      // SYNC_COPY is only for challenges, not regular access
      return { canAccess: true, accessLevel: "READ_ONLY" };
    }
  }

  return { canAccess: false, reason: "No access granted" };
}

// Note: SYNC_COPY tracking functions (getSourceCourseProgress, getSyncCopyUsers) 
// are only used for challenges and kept in EnhancedChallengeService

/**
 * Permission check helpers
 */
export function canInitiateProject(accessLevel: CourseAccessLevel | "OWNER" | null): boolean {
  // SYNC_COPY is only for challenges, not regular course access
  return accessLevel === "OWNER" || accessLevel === "COPY";
}

export function canStartProject(accessLevel: CourseAccessLevel | "OWNER" | null): boolean {
  return canInitiateProject(accessLevel);
}

export function canCommit(accessLevel: CourseAccessLevel | "OWNER" | null): boolean {
  return canInitiateProject(accessLevel);
}

export function canUpdateCourse(accessLevel: CourseAccessLevel | "OWNER" | null): boolean {
  return accessLevel === "OWNER";
}

export function canViewCourse(accessLevel: CourseAccessLevel | "OWNER" | null): boolean {
  return accessLevel !== null;
}


