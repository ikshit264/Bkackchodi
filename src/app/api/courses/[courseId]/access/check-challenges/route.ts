import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../../../lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { courseId } = await params;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    
    if (!targetUserId) {
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
    }

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const course = await prisma.course.findUnique({ 
      where: { id: courseId }, 
      select: { id: true, userId: true } 
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // Only OWNER can check
    if (course.userId !== me.id) {
      return NextResponse.json({ error: "Forbidden: Only course owner can check challenges" }, { status: 403 });
    }

    // Check if user has challenges associated with this course
    const challengeParticipants = await prisma.challengeParticipant.findMany({
      where: {
        userId: targetUserId,
        challenge: {
          courseId: courseId,
        },
      },
      include: {
        challenge: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      hasChallenges: challengeParticipants.length > 0,
      challengeNames: challengeParticipants.map(p => p.challenge.name),
      challenges: challengeParticipants.map(p => ({
        id: p.challenge.id,
        name: p.challenge.name,
        status: p.challenge.status,
      })),
    }, { status: 200 });
  } catch (error) {
    console.error("Check challenges error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}










