import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";
import { updateGroupScore } from "../../../../lib/GroupScoreCalculator";
import { updateGlobalScore } from "../../../../lib/GlobalScoreCalculator";

const prisma = getPrismaClient();

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  try {
    const user = await currentUser();
    console.log("user", user.id);
    if (!user) {
      return NextResponse.json({ error: "Not Signed In" }, { status: 401 });
    }

    // 📥 Extract data from request body
    const body = await request.json();
    console.log("body", body);
    const { title, description, batches, groupId } = body;

    if (!title || !description || !batches || !Array.isArray(batches)) {
      return NextResponse.json(
        { error: "Incomplete or invalid data" },
        { status: 400 }
      );
    }

    // Group is optional - if not provided, course will be in Global group

    // Get DB user to verify group membership
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // If groupId provided, verify user is member or owner
    if (groupId) {
      const groupMembership = await prisma.groupMembership.findFirst({
        where: {
          groupId,
          userId: dbUser.id,
          leftAt: null, // Active membership
        },
      });

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { ownerId: true },
      });

      const isOwner = group?.ownerId === dbUser.id;
      const isMember = Boolean(groupMembership);

      if (!isOwner && !isMember) {
        return NextResponse.json(
          { error: "You must be a member or owner of the group to create a course in it" },
          { status: 403 }
        );
      }
    }

    // If groupId not provided, use Global group
    let finalGroupId = groupId;
    if (!finalGroupId) {
      // Get Global group
      const globalGroup = await prisma.group.findUnique({
        where: { name: "Global" },
        select: { id: true },
      });
      if (globalGroup) {
        finalGroupId = globalGroup.id;
      }
    }

    // const isCourseAvailable = await prisma.course.findFirst({
    //   where: {
    //     title,
    //   },
    // });
    

    // if (isCourseAvailable)
    //   return NextResponse.json(
    //     { message: "Course, batches, and projects Already Exists." },
    //     { status: 202 }
    //   );

    // 🏗️ Step 1: Create Course
    const newCourse = await prisma.course.create({
      data: {
        title,
        user: {
          connect: {
            clerkId: user.id,
          },
        },
        ...(finalGroupId && {
          group: {
            connect: { id: finalGroupId },
          },
        }),
      },
    });

    if (!newCourse)
      return NextResponse.json({error : "Course not created"}, {status : 400});

    // console.log(newCourse)

    // 🏗️ Step 2: Bulk Insert Batches
    const batchData = batches.map((batch, index) => ({
      number: batch.number || index,
      courseId: newCourse.id,
    }));

    // console.log(batchData);

    const newbatches = await prisma.batch.createMany({
      data: batchData,
    });

    if (!newbatches)
      return NextResponse.json({error : "batches not created"}, {status : 400});

    // Step 3: Retrieve batch IDs for linking projects
    const storedBatches = await prisma.batch.findMany({
      where: {
        courseId: newCourse.id,
      },
    });

    if (!storedBatches)
      return NextResponse.json({error : "batch stores not found"}, {status : 400});


    // 🏗️ Step 4: Bulk Insert Projects
    const projectData = batches.flatMap((batch) => {
      const batchRecord = storedBatches.find(
        (b) => { return Number(b.number) === Number(batch.batchId) }
      );
      
      // console.log("batchRecord", batchRecord);

      return batch.projects.map((project, index) => ({
        title: project.title,
        position : index,
        description: project.description,
        level: project.level,
        status: project.status || 'not started',
        batchId: batchRecord?.id,
        learningObjectives: project.learningObjectives || {},
        steps: project.steps || null,
        GithubData: project.GithubData || null,
      }));
    });

    const createProjects = await prisma.project.createMany({
      data: projectData,
    });

    if(!createProjects)
      return NextResponse.json({error : "Projects not created"}, {status : 400});

    // Trigger score recalculation (dbUser already defined above at line 38)
    if (dbUser) {
      try {
        // Update group score if course is in a group
        if (newCourse.groupId) {
          await updateGroupScore(dbUser.id, newCourse.groupId);
        }
        // Always update global score (even if no group)
        await updateGlobalScore(dbUser.id, true);
      } catch (error) {
        console.error("Error recalculating scores after course creation:", error);
        // Don't fail the request if score calculation fails
      }
    }

    // Phase 2: Track course creation contribution
    if (dbUser) {
      try {
        const { trackContribution } = await import("../../../../lib/ContributionService");
        await trackContribution(
          dbUser.id,
          "COURSE_CREATED",
          { courseId: newCourse.id, courseTitle: newCourse.title }
        );
        // Also track course started (since creating a course means starting it)
        await trackContribution(
          dbUser.id,
          "COURSE_STARTED",
          { courseId: newCourse.id, courseTitle: newCourse.title }
        );
      } catch (error) {
        console.error("Error tracking course creation contribution:", error);
        // Don't fail the request if tracking fails
      }
    }

    // ✅ Return success response
    return NextResponse.json(
      { message: "Course, batches, and projects uploaded successfully." },
      { status: 201 }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error uploading course:", err?.message || err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
  
}
