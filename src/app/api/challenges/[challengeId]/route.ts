/**
 * GET /api/challenges/[challengeId] - Get challenge details
 * DELETE /api/challenges/[challengeId] - Delete challenge (soft delete) and downgrade access
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { GetUserByUserId } from "../../../../components/actions/user/index";
import { downgradeSyncCopyToCopy } from "../../../../lib/SharingService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params;

    const challenge = await prisma.challenge.findUnique({
      where: {
        id: challengeId,
        isDeleted: false,
      },
      include: {
        sector: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
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
        creator: {
          select: {
            id: true,
            userName: true,
            name: true,
            lastName: true,
            avatar: true,
          },
        },
        participants: {
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
          },
          orderBy: [
            { status: "asc" },
            { completedAt: "desc" },
          ],
          take: 10, // Top 10 participants
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Count only participants with JOINED status
    const joinedCount = await prisma.challengeParticipant.count({
      where: {
        challengeId: challenge.id,
        status: "JOINED",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...challenge,
        _count: {
          participants: joinedCount,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch challenge" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/challenges/[challengeId] - Soft delete challenge and downgrade access
 */
export async function DELETE(
  _request: NextRequest,
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
      where: { id: challengeId, isDeleted: false },
      select: { id: true, courseId: true, createdBy: true, status: true },
    });

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Only creator or admin can delete
    if (challenge.createdBy !== user.id) {
      // Check if user is admin
      const { isAdmin } = await import("../../../../utils/admin");
      if (!(await isAdmin())) {
        return NextResponse.json(
          { success: false, error: "Only challenge creator or admin can delete" },
          { status: 403 }
        );
      }
    }

    // Downgrade SYNC_COPY to COPY for all participants before deleting
    if (challenge.courseId) {
      const participants = await prisma.challengeParticipant.findMany({
        where: {
          challengeId: challenge.id,
          status: {
            in: ["JOINED", "IN_PROGRESS", "COMPLETED"],
          },
        },
        select: { userId: true },
      });

      for (const participant of participants) {
        try {
          await downgradeSyncCopyToCopy(participant.userId, challenge.courseId);
        } catch (error) {
          console.error(`Error downgrading access for user ${participant.userId}:`, error);
        }
      }
    }

    // Soft delete challenge
    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: "CANCELLED", // Also mark as cancelled
      },
    });

    return NextResponse.json({
      success: true,
      message: "Challenge deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete challenge" },
      { status: 500 }
    );
  }
}


