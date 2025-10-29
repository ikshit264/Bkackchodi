import { NextRequest, NextResponse } from "next/server";
import { createRepo } from "../../../../../utils/github/GithubRepo";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, repoName, desc, projectId } = body;

  if (!userId || !repoName || !desc) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    const RepoName = await createRepo(userId, projectId, repoName, desc);

    await prisma.project.update({
      where: { id: projectId },
      data: { githubRepo: RepoName },
    });

    return NextResponse.json({ success: true, RepoName });
  } catch (error) {
    console.error("Error creating repo:", error);
    return NextResponse.json(
      { error: "Failed to create repo" },
      { status: 500 }
    );
  }
}
