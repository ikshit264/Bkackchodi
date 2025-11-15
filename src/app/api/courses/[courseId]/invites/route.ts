import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../components/actions/user/index";
import { createCourseInvite } from "../../../../../lib/InviteService";
import { createCourseInviteSchema } from "../../../../../lib/validations/sharing";

// List invites for a course (owner only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { courseId } = await params;

    const user = await GetUserByUserId(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const course = await prisma.course.findUnique({
      where: { id: courseId, isDeleted: false },
      select: { userId: true },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    if (course.userId !== user.id)
      return NextResponse.json({ error: "Forbidden: Only course owner can view invites" }, { status: 403 });

    const invites = await prisma.courseInvite.findMany({
      where: { courseId },
      include: {
        toUser: { select: { id: true, userName: true, email: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const accesses = await prisma.courseAccess.findMany({
      where: { courseId, isDeleted: false },
      select: { userId: true, access: true },
    });

    const accessesWithUsers = await prisma.courseAccess.findMany({
      where: { courseId, isDeleted: false },
      include: {
        user: { select: { id: true, userName: true, email: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({ data: { invites, accesses, accessesWithUsers } }, { status: 200 });
  } catch (error) {
    console.error("List course invites error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create course invite with access level
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { courseId } = await params;
    const body = await request.json();

    const validation = createCourseInviteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
        },
        { status: 400 }
      );
    }

    const { toUserQuery, access } = validation.data;

    // SYNC_COPY is only for challenges, not regular course sharing
    if (access === "SYNC_COPY") {
      return NextResponse.json(
        { error: "SYNC_COPY access can only be granted through challenges" },
        { status: 400 }
      );
    }

    const user = await GetUserByUserId(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const course = await prisma.course.findUnique({
      where: { id: courseId, isDeleted: false },
      select: { id: true, userId: true },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // Only OWNER can create invites
    if (course.userId !== user.id)
      return NextResponse.json({ error: "Forbidden: Only course owner can create invites" }, { status: 403 });

    // Check if user has challenge course for this source course (unused but kept for potential future use)
    await prisma.challengeParticipant.findFirst({
      where: {
        userId: (await prisma.user.findFirst({
          where: {
            OR: [
              { userName: { contains: toUserQuery, mode: "insensitive" } },
              { email: { contains: toUserQuery, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        }))?.id || "",
        challenge: {
          courseId: courseId,
        },
        challengeCourseId: {
          not: null,
        },
      },
    });

    // Note: SYNC_COPY is only for challenges, handled in challenge services
    // Regular course sharing only supports READ_ONLY and COPY

    // Use service to create invite
    const invite = await createCourseInvite(courseId, user.id, toUserQuery, access);

    return NextResponse.json({ data: invite }, { status: 201 });
  } catch (error) {
    console.error("Create course invite error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
