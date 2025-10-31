import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";

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

    // Fetch courses
    const courses = await prisma.course.findMany({
      where: { userId: dbUser.id },
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

    const { title } = await req.json();

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Course title is required" },
        { status: 400 }
      );
    }

    const newCourse = await prisma.course.create({
      data: {
        title,
        user: {
          connect: { clerkId: user.id },
        },
      },
    });

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

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { title: newTitle },
    });

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
