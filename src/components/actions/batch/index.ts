"use server";

import { prisma } from "../../../../lib/prisma";
import { GetUserIdByName } from "../user";

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

export async function getBatchProjectsByCourseId(userName : string, CourseId: string) {
  const userId = await GetUserIdByName(userName);
  if (!userId) {
    throw Error("User Id Not Found");
  }

  const response = await prisma.course.findFirst({
    where: {
      userId: userId,
      id: CourseId,
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
  return response;
}

export async function getBatchProjectsByBatchId(userId: string, batchId: string) {
  try {
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
