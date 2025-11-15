export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UpdateIssues } from "../../../../../../utils/github/GithubProjectBackchodi";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { issues, batchId } = body;

    // Input validation
    if (!batchId || !Array.isArray(issues) || issues.length === 0) {
      return NextResponse.json(
        {
          error: "Missing or invalid fields: batchId and issues (non-empty array) are required.",
        },
        { status: 400 }
      );
    }

    // Find GitHub project ID from batch
    const batch = await prisma.batch.findFirst({
      where: { id: batchId },
      select: { githubProjectId: true },
    });

    if (!batch || !batch.githubProjectId) {
      return NextResponse.json({ error: "GitHub project not found for the given batchId." }, { status: 404 });
    }

    // Permission: ensure current user is owner of the course
    // COPY access creates owned courses, READ_ONLY access is read-only
    const viewer = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const courseForBatch = await prisma.batch.findUnique({ where: { id: batchId }, select: { course: { select: { id: true, userId: true } } } });
    if (!courseForBatch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    const isOwner = courseForBatch.course?.userId === viewer.id;
    if (!isOwner) return NextResponse.json({ error: "Forbidden: only course owner can update issues" }, { status: 403 });

    // Perform the update using UpdateIssues()
    const updateResult = await UpdateIssues(
      batch.githubProjectId,
      issues, // [{ issueId, status }]
      viewer.id,
      undefined
    );

    if (!updateResult) {
      return NextResponse.json({ error: "Failed to update GitHub issues." }, { status: 500 });
    }

    return NextResponse.json({ message: "Issues updated successfully." }, { status: 200 });

  } catch (error) {
    console.error("Error updating GitHub issues:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
