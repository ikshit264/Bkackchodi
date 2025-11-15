"use server"

import { prisma } from "../../../../lib/prisma"

export async function GetProjectByProjectId(id : string) {
  if (!id) {
    throw new Error("GetProjectById: Provided id is invalid or undefined");
  }
  const response = await prisma.project.findFirst({
    where: {
      id: id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      level: true,
      status: true,
      learningObjectives: true,
      steps: true,
      GithubData: true,
      githubRepo: true,
      aiEvaluationScore: true, // Include evaluation score
      evaluatedAt: true, // Include evaluation timestamp
      createdAt: true,
      updatedAt: true,
      batchId: true,
      position: true,
      batch: { select: { id: true, course: { select: { id: true, userId: true, user: { select: { userName: true } } } } } }
    }
  });
  if (!response) {
    throw new Error("Project not found");
  }
  return response;
}
