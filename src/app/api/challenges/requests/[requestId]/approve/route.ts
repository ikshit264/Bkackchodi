/**
 * POST /api/challenges/requests/[requestId]/approve - Approve challenge request
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../../components/actions/user/index";
import {
  cloneCourseForChallenge,
  createProjectCourseForChallenge,
  calculateChallengePoints,
  updateChallengeRankings,
} from "../../../../../../lib/EnhancedChallengeService";
import { ensureSyncCopyAccess } from "../../../../../../lib/SharingService";
import { createNotification } from "../../../../../../lib/NotificationHelper";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
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

    const { requestId } = await params;

    // Get the request
    const challengeRequest = await prisma.challengeRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: {
            id: true,
            userName: true,
          },
        },
        group: {
          include: {
            members: {
              where: {
                leftAt: null,
              },
            },
          },
        },
      },
    });

    if (!challengeRequest) {
      return NextResponse.json(
        { success: false, error: "Challenge request not found" },
        { status: 404 }
      );
    }

    if (challengeRequest.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Request has already been processed" },
        { status: 400 }
      );
    }

    // Check if user is owner/admin of the group
    const isOwner = challengeRequest.group.ownerId === user.id;
    const isAdmin = challengeRequest.group.members.some(
      (m) => m.userId === user.id && (m.role === "OWNER" || m.role === "ADMIN")
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Only group owners/admins can approve challenge requests" },
        { status: 403 }
      );
    }

    // If request has course/project, clone it to owner's account first (so owner has access)
    // But we'll use the original requester's course ID for the challenge and invitations
    if (challengeRequest.courseId) {
      try {
        // Clone course to owner's account (so owner can access it)
        await cloneCourseForChallenge(user.id, challengeRequest.courseId);

        // Ensure SYNC_COPY access (challenges automatically grant SYNC_COPY)
        await ensureSyncCopyAccess(user.id, challengeRequest.courseId);
      } catch (error) {
        console.error("Error cloning course for owner:", error);
        // Don't fail - owner might already have it
      }
    } else if (challengeRequest.projectId) {
      try {
        // Create project course for owner (so owner can access it)
        await createProjectCourseForChallenge(
          user.id,
          challengeRequest.projectId,
          challengeRequest.name
        );
      } catch (error) {
        console.error("Error creating project course for owner:", error);
        // Don't fail - continue anyway
      }
    }

    // Create the challenge with owner as creator
    // Use original requester's course/project ID (not owner's cloned version)
    const challenge = await prisma.challenge.create({
      data: {
        name: challengeRequest.name,
        description: challengeRequest.description,
        type: challengeRequest.type,
        status: "DRAFT",
        isPublic: false,
        groupId: challengeRequest.groupId,
        courseId: challengeRequest.courseId, // Use original requester's course ID
        projectId: challengeRequest.projectId, // Use original requester's project ID
        startDate: challengeRequest.startDate,
        endDate: challengeRequest.endDate,
        criteria: challengeRequest.criteria,
        rewards: challengeRequest.rewards,
        createdBy: user.id, // Owner becomes the creator
        maxParticipants: challengeRequest.maxParticipants,
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

    // Update request status
    await prisma.challengeRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        challengeId: challenge.id,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });

    // Notify the requester that their request was approved
    try {
      await createNotification(challengeRequest.requestedBy, "CHALLENGE_REQUEST_APPROVED", {
        requestId: challengeRequest.id,
        challengeId: challenge.id,
        challengeName: challenge.name,
        groupId: challengeRequest.groupId,
        groupName: challengeRequest.group.name,
      });
    } catch (error) {
      console.error("Error sending approval notification to requester:", error);
    }

    // Add owner as a participant automatically
    let ownerChallengeCourseId: string | null = null;
    let ownerChallengeProjectId: string | null = null;

    if (challenge.courseId) {
      try {
        ownerChallengeCourseId = await cloneCourseForChallenge(user.id, challenge.courseId);

        // Ensure SYNC_COPY access (challenges automatically grant SYNC_COPY)
        await ensureSyncCopyAccess(user.id, challenge.courseId);
      } catch (error) {
        console.error("Error cloning course for owner:", error);
        // Continue - owner might already have it
      }
    } else if (challenge.projectId) {
      try {
        ownerChallengeCourseId = await createProjectCourseForChallenge(
          user.id,
          challenge.projectId,
          challenge.name
        );
        ownerChallengeProjectId = challenge.projectId;
      } catch (error) {
        console.error("Error creating project course for owner:", error);
        // Continue anyway
      }
    }

    // Create participant record for owner
    const ownerParticipant = await prisma.challengeParticipant.upsert({
      where: {
        challengeId_userId: {
          challengeId: challenge.id,
          userId: user.id,
        },
      },
      update: {
        status: "JOINED",
        challengeCourseId: ownerChallengeCourseId,
        challengeProjectId: ownerChallengeProjectId,
      },
      create: {
        challengeId: challenge.id,
        userId: user.id,
        status: "JOINED",
        progress: {},
        challengeCourseId: ownerChallengeCourseId,
        challengeProjectId: ownerChallengeProjectId,
      },
    });

    // Calculate initial points for owner
    if (ownerChallengeCourseId) {
      try {
        const points = await calculateChallengePoints(user.id, challenge.id);
        await prisma.challengeParticipant.update({
          where: { id: ownerParticipant.id },
          data: { points },
        });
        await updateChallengeRankings(challenge.id);
      } catch (error) {
        console.error("Error calculating initial points for owner:", error);
      }
    }

    // Create invitations for all group members (except owner)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invites: Array<{
      challengeId: string;
      fromUserId: string;
      toUserId: string;
      status: string;
      expiresAt: Date;
    }> = [];

    for (const member of challengeRequest.group.members) {
      if (member.userId !== user.id) {
        invites.push({
          challengeId: challenge.id,
          fromUserId: user.id,
          toUserId: member.userId,
          status: "PENDING",
          expiresAt,
        });
      }
    }

    if (invites.length > 0) {
      // Create invites and get their IDs
      const createdInvites = await Promise.all(
        invites.map(inviteData =>
          prisma.challengeInvite.create({
            data: inviteData,
          })
        )
      );

      // Send notifications with inviteId
      for (const invite of createdInvites) {
        try {
          await createNotification(invite.toUserId, "CHALLENGE_INVITE", {
            inviteId: invite.id,
            challengeId: challenge.id,
            challengeName: challenge.name,
            fromUserId: user.id,
            fromUserName: user.userName,
          });
        } catch (error) {
          console.error("Error sending notification:", error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        challenge,
        request: challengeRequest,
      },
    });
  } catch (error) {
    console.error("Error approving challenge request:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to approve request" },
      { status: 500 }
    );
  }
}

