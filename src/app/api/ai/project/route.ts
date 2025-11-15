import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PROMPT_PROJECT } from "../../../../utils/prompt";
import { prisma } from "../../../../../lib/prisma";
import { getGroqApiKeyServer } from "../../../../utils/apiKeys.server";
import { updateGroupScore } from "../../../../lib/GroupScoreCalculator";
import { updateGlobalScore } from "../../../../lib/GlobalScoreCalculator";


const prompt = ChatPromptTemplate.fromMessages([
  ["system", PROMPT_PROJECT as string],
]);

const output_parsers = new StringOutputParser();

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Get API key from database or environment
    const apiKey = await getGroqApiKeyServer();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Groq API key not found. Please add it in your profile settings." },
        { status: 500 }
      );
    }

    // Initialize LLM with dynamic API key
    const llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      maxTokens: 8192,
      apiKey: apiKey,
      verbose: true,
    });

    const chain = prompt.pipe(llm).pipe(output_parsers);

    const { topic, learning_objectives, projectId } = await req.json();

    // Permission check: user must be OWNER of the course OR have SYNC_COPY access to a cloned course
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        batch: { 
          include: { 
            course: { 
              select: { 
                id: true, 
                userId: true,
                sourceCourseId: true // Check if it's a cloned course
              } 
            } 
          } 
        } 
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const dbUser = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    
    const isOwner = dbUser.id === project.batch?.course?.userId;
    if (!isOwner) {
      // Check if user has COPY access (cloned course)
      if (project.batch?.course?.sourceCourseId) {
        const { validateCourseAccess } = await import("../../../../lib/SharingService");
        const access = await validateCourseAccess(dbUser.id, project.batch.course.sourceCourseId);
        // COPY creates owned courses, so user should be owner of cloned course
        // SYNC_COPY is only for challenges
        if (access.accessLevel !== "COPY" && access.accessLevel !== "OWNER") {
          return NextResponse.json({ error: "Forbidden: only course owner or users with COPY access can start projects" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Forbidden: only course owner can start projects" }, { status: 403 });
      }
    }

    const res = await chain.invoke({
      topic,
      learning_objectives,
    });

    const { jsonObject, text } = separateJSONandText(res);

    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        status : "in progress",
        batch : {
          update : {
            status : "in progress",
            course : {
              update : {
                status : "in progress",
              }
            }
          }
          
        }
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
    // When a project is started, it affects the "projects started" metric
    if (updatedProject.batch?.course?.groupId && updatedProject.batch.course.userId) {
      try {
        await updateGroupScore(
          updatedProject.batch.course.userId,
          updatedProject.batch.course.groupId
        );
        await updateGlobalScore(updatedProject.batch.course.userId, true);
      } catch (error) {
        console.error("Error recalculating scores after project start:", error);
        // Don't fail the request if score calculation fails
      }
    }


    return NextResponse.json({ jsonObject, text });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

function separateJSONandText(data: string): { jsonObject: string; text: string } {
    const jsonMatches = data.match(/```json([\s\S]*?)```/g);
    const jsonObject = jsonMatches ? jsonMatches.map(match => match.replace(/```json|```/g, "").trim()).join("\n") : "";
    const text = data.replace(/```json([\s\S]*?)```/g, "").trim();
    return { jsonObject, text };
  }