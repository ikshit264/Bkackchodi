"use server";

import { prisma } from "../../../lib/prisma";
import { GetUserIdByName } from "../user";
import { auth } from "@clerk/nextjs/server";

export async function GetBatchesByUserIdAndCourseName(
  id: string,
  courseName: string
) {
  if (!id) {
    throw new Error("GetUserByUserId: Provided id is invalid or undefined");
  }
  console.log("id, courseName", id, courseName);
  const response = await prisma.course.findFirst({
    where: {
      userId: id,
      title: courseName,
    },
    select: {
      id: true,
      title: true,
      status: true,
      batch: {
        select: {
          id: true,
          githubProjectId: true,
          status: true,
          number: true,
          projects: {
            select: {
              title: true,
              id: true,
              status: true,
              level: true,
              position: true,
            },
          },
        },
      },
    },
  });

  if (!response) {
    throw new Error("Courses not found in Course");
  }

  return response;
}

export async function getBatchesByUserNameandCourseName(
  userName: string,
  courseName: string,
) {
  const userId = await GetUserIdByName(userName);
  if (!userId) {
    throw Error("User Id Not Found");
  }
  const batches = await GetBatchesByUserIdAndCourseName(userId, courseName);

  if (!batches) {
    throw Error("Course not found");
  }
  return batches;
}

export async function getBatchProjectsByCourseId(CourseId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const viewer = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, userName: true } });
  if (!viewer) {
    throw new Error("Unauthorized");
  }

  const course = await prisma.course.findFirst({
    where: { id: CourseId },
    select: {
      id: true,
      title: true,
      status: true,
      userId: true,
      user: { select: { userName: true } },
      group: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      sectorId: true,
      batch: {
        select: {
          id: true,
          githubProjectId: true,
          status: true,
          number: true,
          projects: {
            select: {
              title: true,
              id: true,
              status: true,
              level: true,
              position: true,
            },
          },
        },
      },
    },
  });
  if (!course) return null;

  // permission: owner or has READ_ONLY/SYNC_COPY/COPY access
  // COPY creates owned courses, so only READ_ONLY and SYNC_COPY exist in CourseAccess
  const isOwner = course.userId === viewer.id;
  let role: 'OWNER'|'READ_ONLY'|'SYNC_COPY'|'COPY'|null = null;
  if (isOwner) {
    role = 'OWNER';
  } else {
    const access = await prisma.courseAccess.findFirst({ 
      where: { 
        courseId: course.id, 
        userId: viewer.id,
        isDeleted: false 
      }, 
      select: { access: true } 
    });
    if (!access) {
      throw new Error("Forbidden");
    }
    // Set role based on access level
    // Note: SYNC_COPY is only for challenges, treat as READ_ONLY for regular access
    if (access.access === 'READ_ONLY') {
      role = 'READ_ONLY';
    } else if (access.access === 'COPY') {
      role = 'COPY';
    } else if (access.access === 'SYNC_COPY') {
      // SYNC_COPY is only for challenges, but we still need to allow viewing
      role = 'READ_ONLY';
    } else {
      throw new Error("Forbidden");
    }
  }

  // Get sector info if exists
  let sector = null;
  if (course.sectorId) {
    sector = await prisma.group.findUnique({
      where: { id: course.sectorId },
      select: {
        id: true,
        name: true,
        icon: true,
        type: true,
      },
    });
  }

  // Check if course is part of a challenge
  let challenge = null;
  const challengeParticipant = await prisma.challengeParticipant.findFirst({
    where: {
      challengeCourseId: CourseId,
      userId: viewer.id,
    },
    include: {
      challenge: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          type: true,
          startDate: true,
          endDate: true,
          sector: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
      },
    },
  });

  if (challengeParticipant?.challenge) {
    challenge = challengeParticipant.challenge;
  }

  return { 
    ...course, 
    __meta: { 
      role, 
      ownerUserName: course.user?.userName,
      sector,
      challenge,
    } 
  } as any;
}

export async function getBatchProjectsByBatchId(batchId: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');
    const viewer = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!viewer) throw new Error('Unauthorized');

    // permission via course
    const batchWithCourse = await prisma.batch.findUnique({ where: { id: batchId }, select: { course: { select: { id: true, userId: true } } } });
    if (!batchWithCourse) throw new Error('Batch not found');
    const isOwner = batchWithCourse.course?.userId === viewer.id;
    const access = await prisma.courseAccess.findFirst({ where: { courseId: batchWithCourse.course?.id || undefined, userId: viewer.id }, select: { access: true } });
    const hasAccess = isOwner || Boolean(access);
    if (!hasAccess) throw new Error('Forbidden');

    const batch = await prisma.batch.findUnique({
      where: {
        id: batchId,
      },
      include: {
        projects: {
          orderBy: {
            position: 'asc'
          },
          select: {
            id: true,
            title: true,
            level: true,
            position: true,
            steps : true,
            status: true,
            description: true,
            learningObjectives: true
          }
        }
      }
    });

    if (!batch) {
      throw new Error(`Batch with id ${batchId} not found`);
    }

    // Transform the data to match the expected Batch type
    const formattedBatch = {
      id: batch.id,
      number: batch.number,
      projects: batch.projects.map(project => ({
        id: project.id,
        title: project.title,
        level: project.level as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Unknown',
        position: project.position,
        steps: project.steps,
        status: project.status || undefined,
        description: project.description || undefined,
        learningObjectives: project.learningObjectives as string[] || []
      }))
    };

    return formattedBatch;

  } catch (error) {
    console.error('Error in getBatchProjectsByBatchId:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch batch projects');
  }
}
