/**
 * GET /api/challenges/[challengeId]/progress/[userId] - Get user progress
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { calculateChallengePoints } from "../../../../../../lib/EnhancedChallengeService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string; userId: string }> }
) {
  try {
    const { challengeId, userId } = await params;

    const participant = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
      include: {
        challenge: {
          select: {
            id: true,
            name: true,
            criteria: true,
            endDate: true,
            type: true,
            status: true,
            startDate: true,
            courseId: true,
            projectId: true,
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
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: "User is not participating in this challenge" },
        { status: 404 }
      );
    }

    // Recalculate points if challenge has course/project
    let points = participant.points;
    if (participant.challenge.courseId || participant.challenge.projectId) {
      try {
        points = await calculateChallengePoints(userId, challengeId);
        // Update if different
        if (points !== participant.points) {
          await prisma.challengeParticipant.update({
            where: {
              challengeId_userId: {
                challengeId,
                userId,
              },
            },
            data: { points },
          });
        }
      } catch (error) {
        console.error("Error recalculating points:", error);
      }
    }

    // Don't include rank if participant is FAILED
    const { rank, ...participantData } = participant;
    const responseData = {
      ...participantData,
      points, // Include recalculated points
      rank: participant.status === "FAILED" ? null : rank, // Set rank to null for failed participants
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching challenge progress:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch progress" },
      { status: 500 }
    );
  }
}


