import { NextRequest, NextResponse } from "next/server";
import { createProjectWithIssue, ProjectWithIssueParams, ProjectWithIssueResult } from "../../../../../utils/github/GithubProjectBackchodi";
import getPrismaClient from "../../../../../lib/prisma";

const prisma = getPrismaClient();

export async function POST(req : NextRequest){
    const body = await req.json();
    const {
        owner,
        userId,
        batchId,
        repoName,
        ownerType,
        projectTitle,
        issueTitle,
        issueBody,
        issueLabel,
      } = body;

    if (!owner || !userId || !repoName || !ownerType || !projectTitle || !issueTitle || !issueBody || !issueLabel || !batchId) {
        return NextResponse.json(
        { error: "owner, userId, repoName, ownerType, projectTitle, issueTitle, issueBody, and issueLabel are required" },
        { status: 400 }
        );
    }

    const projectId = await prisma.batch.findFirst({
        where: {
            id: batchId,
            user: {
                clerkId: userId,
            },
        },
        select: {
            githubProjectId : true,
        },
    })

    if(!projectId){
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project : ProjectWithIssueResult = await createProjectWithIssue({
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

    return NextResponse.json(project, { status: 200 });
}

