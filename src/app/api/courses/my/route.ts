import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";

const prisma = getPrismaClient();

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [owned, shared] = await Promise.all([
      prisma.course.findMany({
        where: { userId: me.id },
        include: { user: { select: { userName: true } }, group: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.course.findMany({
        where: { 
          accesses: { 
            some: { 
              userId: me.id,
              isDeleted: false // Only include non-deleted access records
            } 
          } 
        },
        include: {
          accesses: { 
            where: { 
              userId: me.id,
              isDeleted: false 
            }, 
            select: { access: true } 
          },
          user: { select: { userName: true } },
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Get all course IDs to check for challenge assignments
    const allCourseIds = [...owned.map(c => c.id), ...shared.map(c => c.id)];
    
    // Find challenge participants for these courses
    const challengeParticipants = await prisma.challengeParticipant.findMany({
      where: {
        userId: me.id,
        challengeCourseId: { in: allCourseIds },
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

    // Create a map of courseId -> challenge info
    const challengeMap = new Map<string, { name: string; status: string }>();
    for (const participant of challengeParticipants) {
      if (participant.challengeCourseId && participant.challenge) {
        challengeMap.set(participant.challengeCourseId, {
          name: participant.challenge.name,
          status: participant.challenge.status,
        });
      }
    }

    // Merge and de-duplicate (if any overlap)
    // Note: Cloned courses appear in owned (they become user's own courses), not in shared
    const map = new Map<string, {
      id: string;
      title: string;
      user?: { userName?: string };
      accesses?: Array<{ access?: string }>;
      [key: string]: unknown;
    }>();
    for (const c of owned) {
      const challengeInfo = challengeMap.get(c.id);
      map.set(c.id, { 
        ...c, 
        __meta: { 
          ownership: "OWNER" as const,
          accessLevel: "OWNER" as const,
          ownerUserName: c.user?.userName,
          challenge: challengeInfo || null,
        } 
      });
    }
    for (const c of shared) {
      // Shared courses have READ_ONLY, COPY, or SYNC_COPY access
      // Note: SYNC_COPY is only for challenges
      const access = c.accesses?.[0]?.access || "READ_ONLY";
      // Map access levels for display
      let ownership: "READ_ONLY" | "COPY" | "SYNC_COPY" = "READ_ONLY";
      if (access === "COPY") {
        ownership = "COPY";
      } else if (access === "SYNC_COPY") {
        // SYNC_COPY is only for challenges, but keep it for display purposes
        ownership = "SYNC_COPY";
      } else {
        ownership = "READ_ONLY";
      }
      const challengeInfo = challengeMap.get(c.id);
      map.set(c.id, { 
        ...c, 
        __meta: { 
          ownership,
          accessLevel: access,
          ownerUserName: c.user?.userName,
          challenge: challengeInfo || null,
        } 
      });
    }
    const data = Array.from(map.values());

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("List my courses error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


