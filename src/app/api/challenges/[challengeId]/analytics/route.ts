/**
 * GET /api/challenges/[challengeId]/analytics - Get challenge analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../components/actions/user/index";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await GetUserByUserId(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { challengeId } = await params;

    // Get challenge
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Get all participants with their progress
    const participants = await prisma.challengeParticipant.findMany({
      where: {
        challengeId,
        status: {
          in: ["JOINED", "IN_PROGRESS", "COMPLETED"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            name: true,
            lastName: true,
            avatar: true,
          },
        },
        challengeCourse: {
          include: {
            batch: {
              include: {
                projects: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    aiEvaluationScore: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { rank: "asc" },
        { points: "desc" },
      ],
    });

    // Calculate analytics
    const totalParticipants = participants.length;
    const completedCount = participants.filter((p) => p.status === "COMPLETED").length;
    const inProgressCount = participants.filter((p) => p.status === "IN_PROGRESS").length;
    const averagePoints =
      participants.length > 0
        ? participants.reduce((sum, p) => sum + p.points, 0) / participants.length
        : 0;
    const maxPoints = participants.length > 0 ? Math.max(...participants.map((p) => p.points)) : 0;

    // Participant details with course progress
    const participantDetails = participants.map((p) => {
      let courseProgress = 0;
      let completedProjects = 0;
      let totalProjects = 0;

      if (p.challengeCourse) {
        for (const batch of p.challengeCourse.batch) {
          for (const project of batch.projects) {
            totalProjects++;
            if (project.status === "completed") {
              completedProjects++;
            }
          }
        }
        if (totalProjects > 0) {
          courseProgress = Math.round((completedProjects / totalProjects) * 100);
        }
      }

      return {
        userId: p.userId,
        userName: p.user.userName,
        name: `${p.user.name} ${p.user.lastName}`.trim(),
        avatar: p.user.avatar,
        rank: p.rank,
        points: p.points,
        status: p.status,
        courseProgress,
        completedProjects,
        totalProjects,
        joinedAt: p.joinedAt,
        completedAt: p.completedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        challenge: {
          id: challenge.id,
          name: challenge.name,
          status: challenge.status,
          startDate: challenge.startDate,
          endDate: challenge.endDate,
          course: challenge.course,
          project: challenge.project,
        },
        analytics: {
          totalParticipants,
          completedCount,
          inProgressCount,
          averagePoints: Math.round(averagePoints),
          maxPoints,
        },
        participants: participantDetails,
      },
    });
  } catch (error) {
    console.error("Error fetching challenge analytics:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

