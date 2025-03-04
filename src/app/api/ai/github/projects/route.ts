import { NextRequest, NextResponse } from "next/server";
import { createProjectWithIssue, ProjectWithIssueResult } from "../../../../../utils/github/GithubProjectBackchodi";
import getPrismaClient from "../../../../../lib/prisma";

const prisma = getPrismaClient();

export async function POST(req: NextRequest) {
    const body = await req.json();
    const {
        owner,
        userId,
        batchId,
        repoName,
        BatchProjectId,
        stepIndex,
        ownerType,
        projectTitle,
        issueTitle,
        issueBody,
        issueLabel,
    } = body;

    // Validation
    if (!owner || !userId || !repoName || !ownerType || !projectTitle || !issueTitle || !issueBody || !batchId || stepIndex === undefined) {
        return NextResponse.json(
            { error: "owner, userId, repoName, ownerType, projectTitle, issueTitle, issueBody, batchId, and stepIndex are required" },
            { status: 400 }
        );
    }

    // Find project ID
    const projectId = await prisma.batch.findFirst({
        where: { id: batchId },
        select: { githubProjectId: true },
    });

    if (!projectId) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create project with issue
    const project: ProjectWithIssueResult = await createProjectWithIssue({
        owner,
        userId,
        repoName,
        ownerType,
        projectId: projectId.githubProjectId,
        projectTitle,
        issueTitle,
        issueBody,
        issueLabel
    });

    if (!project) {
        return NextResponse.json({ error: "Project creation failed" }, { status: 500 });
    }

    // Update batch with GitHub project ID
    const updatedBatch = await prisma.batch.update({
        where: { id: batchId },
        data: { githubProjectId: project.projectId }
    });

    if (!updatedBatch) {
        return NextResponse.json({ error: "Batch update failed" }, { status: 500 });
    }

    // Find the current project to get existing steps
    const currentProject = await prisma.project.findUnique({
        where: { id: BatchProjectId },
        select: { steps: true }
    });

    if (!currentProject) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update steps with issueId for specific step
    const updatedSteps = (currentProject.steps as any[]).map((step, index) => {
        if (index === stepIndex) {
            return {
                ...step,
                step: {
                    ...step.step,
                    issueId: project.issueId
                }
            };
        }
        return {
            ...step,
            step: {
                ...step.step,
                issueId: null
            }
        };
    });

    // Update project with modified steps
    const updatedProject = await prisma.project.update({
        where: { id: BatchProjectId },
        data: { steps: updatedSteps },
    });

    if (!updatedProject) {
        return NextResponse.json({ error: "Project update failed" }, { status: 500 });
    }

    return NextResponse.json(project, { status: 200 });
}