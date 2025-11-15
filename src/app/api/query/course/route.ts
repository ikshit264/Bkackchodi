import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";
import { updateGroupScore } from "../../../../lib/GroupScoreCalculator";
import { updateGlobalScore } from "../../../../lib/GlobalScoreCalculator";
import { autoJoinGlobalGroup } from "../../../../lib/GroupService";

const prisma = getPrismaClient();

// Helper function to ensure user exists in DB
async function ensureUserExists(clerkUserId: string) {
  const user = await currentUser();
  if (!user) return null;

  // Try to find existing user
  let dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });

  // If user doesn't exist, create them
  if (!dbUser) {
    console.log("User not in DB, creating...", clerkUserId);
    dbUser = await prisma.user.create({
      data: {
        clerkId: user.id,
        name: user.firstName || "",
        lastName: user.lastName || "",
        avatar: user.imageUrl || "",
        email: user.emailAddresses?.[0]?.emailAddress || "",
        userName: user.username || user.firstName || "User",
        // Set defaults for GitHub fields
        githubToken: "",
        githubOwnerid: "",
        githubId: user.username || "",
      },
    });
    console.log("User created:", dbUser.id);
    
    // Auto-join Global group
    try {
      await autoJoinGlobalGroup(dbUser.id);
      console.log("User auto-joined Global group");
    } catch (error) {
      console.error("Error auto-joining Global group:", error);
      // Don't fail user creation if Global join fails
    }

    // Award Welcome badge on account creation
    try {
      const { checkAndAwardBadges } = await import("../../../../lib/BadgeService");
      await checkAndAwardBadges(dbUser.id, true);
      console.log("Welcome badge check completed");
    } catch (error) {
      console.error("Error checking badges on account creation:", error);
      // Don't fail user creation if badge check fails
    }
  } else {
    // Phase 2: Track login when existing user accesses the app
    try {
      const { trackLogin } = await import("../../../../lib/UnifiedStreakService");
      await trackLogin(dbUser.id).catch((err) => {
        console.error("Error tracking login:", err);
        // Don't fail if tracking fails
      });
    } catch (error) {
      console.error("Error in login tracking:", error);
      // Continue even if tracking fails
    }
  }

  return dbUser;
}

// ------------------ GET COURSES ------------------
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not signed in" },
        { status: 401 }
      );
    }

    console.log("Fetching courses for user:", user.id);

    // Ensure user exists in DB
    const dbUser = await ensureUserExists(user.id);

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "Failed to create/fetch user" },
        { status: 500 }
      );
    }

    // Fetch courses with group info
    const courses = await prisma.course.findMany({
      where: { userId: dbUser.id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Courses fetched successfully",
        data: courses,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Rest of your POST, PUT methods remain the same...

// ------------------ ADD COURSE ------------------
export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not signed in" },
        { status: 401 }
      );
    }

    const { title, groupId, sectorId } = await req.json();

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Course title is required" },
        { status: 400 }
      );
    }

    // Group and sector are optional, but if provided, validate membership
    if (groupId) {

    // Get DB user first
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "User not found in database" },
        { status: 404 }
      );
    }

      // Verify user is member or owner of the group
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
          { success: false, message: "You must be a member or owner of the group to create a course in it" },
          { status: 403 }
        );
      }
    }

    // If sectorId provided, verify user is member of that sector
    if (sectorId) {
      const sectorMembership = await prisma.groupMembership.findFirst({
        where: {
          groupId: sectorId,
          userId: dbUser.id,
          leftAt: null,
        },
      });

      const sector = await prisma.group.findUnique({
        where: { id: sectorId },
        select: { type: true },
      });

      // Verify it's actually a sector (category group)
      if (sector?.type !== "CATEGORY") {
        return NextResponse.json(
          { success: false, message: "Invalid sector ID" },
          { status: 400 }
        );
      }

      if (!sectorMembership) {
        return NextResponse.json(
          { success: false, message: "You must be a member of the sector to assign a course to it" },
          { status: 403 }
        );
      }
    }

    const newCourse = await prisma.course.create({
      data: {
        title,
        user: {
          connect: { clerkId: user.id },
        },
        ...(groupId && {
          group: {
            connect: { id: groupId },
          },
        }),
        ...(sectorId && {
          sectorId: sectorId,
        }),
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Trigger score recalculation if course is in a group or sector
    if (newCourse.groupId && dbUser.id) {
      try {
        await updateGroupScore(dbUser.id, newCourse.groupId);
      } catch (error) {
        console.error("Error recalculating group score after course creation:", error);
      }
    }
    
    // If course is in a sector, also update sector score (sectors are groups with type=CATEGORY)
    if (newCourse.sectorId && dbUser.id) {
      try {
        await updateGroupScore(dbUser.id, newCourse.sectorId);
      } catch (error) {
        console.error("Error recalculating sector score after course creation:", error);
      }
    }
    
    // Always update global score
    if (dbUser.id) {
      try {
        await updateGlobalScore(dbUser.id, true);
      } catch (error) {
        console.error("Error recalculating global score after course creation:", error);
      }
    }

    // Phase 2: Track course creation contribution
    if (dbUser.id) {
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
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Course added successfully",
        data: newCourse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding course:", error);
    return NextResponse.json(
      { success: false, message: "Error occurred while adding course" },
      { status: 500 }
    );
  }
}

// ------------------ UPDATE COURSE ------------------
export async function PUT(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not signed in" },
        { status: 401 }
      );
    }

    const { courseId, newTitle } = await req.json();

    if (!courseId || !newTitle) {
      return NextResponse.json(
        { success: false, message: "Course ID and new title are required" },
        { status: 400 }
      );
    }

    // Get course before update to check for group association and verify ownership
    const courseBeforeUpdate = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        userId: true,
        groupId: true,
      },
    });

    if (!courseBeforeUpdate) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 }
      );
    }

    // Security: Verify user is owner of the course (only OWNER can edit)
    // COPY access creates owned courses, READ_ONLY access is read-only
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const isOwner = dbUser.id === courseBeforeUpdate.userId;
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden: only course owner can edit" },
        { status: 403 }
      );
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { title: newTitle },
      include: {
        group: {
          select: {
            id: true,
          },
        },
      },
    });

    // Trigger score recalculation if course is in a group
    if (updatedCourse.groupId && updatedCourse.userId) {
      try {
        await updateGroupScore(updatedCourse.userId, updatedCourse.groupId);
        await updateGlobalScore(updatedCourse.userId, true);
      } catch (error) {
        console.error("Error recalculating scores after course update:", error);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Course updated successfully",
        data: updatedCourse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { success: false, message: "Error occurred while updating course" },
      { status: 500 }
    );
  }
}
