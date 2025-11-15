/**
 * GET /api/challenges - List all challenges
 * POST /api/challenges - Create challenge (any user)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../lib/prisma";
import { GetUserByUserId } from "../../../components/actions/user/index";
import { isAdmin } from "../../../utils/admin";

export async function GET(request: NextRequest) {
  try {
    // Auto-process challenges on each request (lightweight check)
    try {
      const { autoActivateChallenges, autoCompleteExpiredChallenges } = await import("../../../lib/EnhancedChallengeService");
      await autoActivateChallenges();
      await autoCompleteExpiredChallenges();
    } catch (error) {
      console.error("Error auto-processing challenges:", error);
      // Don't fail the request if auto-processing fails
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const sectorId = searchParams.get("sectorId");
    const groupId = searchParams.get("groupId");

    const where: { isDeleted: boolean; status?: string; type?: string; sectorId?: string; groupId?: string } = {
      isDeleted: false, // Only show non-deleted challenges
    };
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }
    if (sectorId) {
      where.sectorId = sectorId;
    }
    if (groupId) {
      where.groupId = groupId;
    }

    const challenges = await prisma.challenge.findMany({
      where,
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
      },
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Get participant counts for each challenge (only JOINED status)
    const challengesWithCounts = await Promise.all(
      challenges.map(async (challenge) => {
        const joinedCount = await prisma.challengeParticipant.count({
          where: {
            challengeId: challenge.id,
            status: "JOINED",
          },
        });

        return {
          ...challenge,
          _count: {
            participants: joinedCount,
          },
        };
      })
    );

    return NextResponse.json({ success: true, data: challengesWithCounts });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const adminCheck = await isAdmin();
    const body = await request.json();
    const {
      name,
      description,
      type,
      sectorId,
      groupId,
      courseId,
      projectId,
      userIds, // Array of user IDs to invite
      startDate,
      endDate,
      criteria,
      rewards,
      maxParticipants,
      isPublic, // Only admins can set this
    } = body;

    if (!name || !description || !type || !criteria) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate mutually exclusive: groupId OR userIds, not both
    if (groupId && userIds && userIds.length > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot specify both groupId and userIds. Choose one." },
        { status: 400 }
      );
    }

    // Validate mutually exclusive: courseId OR projectId, not both
    if (courseId && projectId) {
      return NextResponse.json(
        { success: false, error: "Cannot specify both courseId and projectId. Choose one." },
        { status: 400 }
      );
    }

    // Validate isPublic (only admins)
    const finalIsPublic = adminCheck ? (isPublic || false) : false;

    // Validate sector (admin only)
    if (sectorId) {
      if (!adminCheck) {
        return NextResponse.json(
          { success: false, error: "Only admins can create sector-specific challenges" },
          { status: 403 }
        );
      }
      const sector = await prisma.group.findUnique({
        where: { id: sectorId },
        select: { type: true },
      });
      if (!sector || sector.type !== "CATEGORY") {
        return NextResponse.json(
          { success: false, error: "Invalid sector ID" },
          { status: 400 }
        );
      }
    }

    // Validate group (user must be owner/admin)
    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            where: {
              userId: user.id,
              leftAt: null,
            },
          },
        },
      });
      if (!group) {
        return NextResponse.json(
          { success: false, error: "Invalid group ID" },
          { status: 400 }
        );
      }
      // Check if user is owner or admin
      // First check if user is the group owner
      const isOwner = group.ownerId === user.id;
      
      // Then check if user is a member with OWNER or ADMIN role
      const membership = group.members[0];
      const isMemberOwnerOrAdmin = membership && (membership.role === "OWNER" || membership.role === "ADMIN");
      
      // If user is not owner/admin, create a request instead
      if (!isOwner && !isMemberOwnerOrAdmin) {
        // Create challenge request for approval
        const challengeRequest = await prisma.challengeRequest.create({
          data: {
            requestedBy: user.id,
            groupId,
            name,
            description,
            type,
            courseId: courseId || null,
            projectId: projectId || null,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            criteria,
            rewards: rewards || null,
            maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
            status: "PENDING",
          },
        });

        // Notify group owner/admin about the request
        try {
          const { createNotification } = await import("../../../lib/NotificationHelper");
          if (group.ownerId) {
            await createNotification(group.ownerId, "CHALLENGE_REQUEST", {
              requestId: challengeRequest.id,
              challengeName: name,
              requesterId: user.id,
              requesterName: user.userName,
              groupId: group.id,
              groupName: group.name,
            });
          }
        } catch (error) {
          console.error("Error sending notification:", error);
        }

        return NextResponse.json({
          success: true,
          data: {
            request: challengeRequest,
            message: "Challenge request created. Waiting for owner/admin approval.",
          },
        }, { status: 201 });
      }
    }

    // Validate course if provided
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) {
        return NextResponse.json(
          { success: false, error: "Invalid course ID" },
          { status: 400 }
        );
      }
    }

    // Validate project if provided
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return NextResponse.json(
          { success: false, error: "Invalid project ID" },
          { status: 400 }
        );
      }
    }

    // Create challenge
    const challenge = await prisma.challenge.create({
      data: {
        name,
        description,
        type,
        status: "DRAFT",
        isPublic: finalIsPublic,
        sectorId: sectorId || null,
        groupId: groupId || null,
        courseId: courseId || null,
        projectId: projectId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        criteria,
        rewards: rewards || null,
        createdBy: user.id,
        maxParticipants: maxParticipants || null,
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
      },
    });

    // Auto-add creator as participant
    let creatorChallengeCourseId: string | null = null;
    let creatorChallengeProjectId: string | null = null;

    if (challenge.courseId) {
      try {
        const { cloneCourseForChallenge } = await import("../../../lib/EnhancedChallengeService");
        const { ensureSyncCopyAccess } = await import("../../../lib/SharingService");
        creatorChallengeCourseId = await cloneCourseForChallenge(user.id, challenge.courseId);

        // Ensure SYNC_COPY access (challenges automatically grant SYNC_COPY)
        await ensureSyncCopyAccess(user.id, challenge.courseId);
      } catch (error) {
        console.error("Error cloning course for creator:", error);
        // Continue - creator might already have it
      }
    } else if (challenge.projectId) {
      try {
        const { createProjectCourseForChallenge } = await import("../../../lib/EnhancedChallengeService");
        creatorChallengeCourseId = await createProjectCourseForChallenge(user.id, challenge.projectId, challenge.name);
        creatorChallengeProjectId = challenge.projectId;
      } catch (error) {
        console.error("Error creating project course for creator:", error);
        // Continue anyway
      }
    }

    // Create participant record for creator
    const creatorParticipant = await prisma.challengeParticipant.upsert({
      where: {
        challengeId_userId: {
          challengeId: challenge.id,
          userId: user.id,
        },
      },
      update: {
        status: challenge.status === "DRAFT" ? "JOINED" : "IN_PROGRESS",
        challengeCourseId: creatorChallengeCourseId,
        challengeProjectId: creatorChallengeProjectId,
      },
      create: {
        challengeId: challenge.id,
        userId: user.id,
        status: challenge.status === "DRAFT" ? "JOINED" : "IN_PROGRESS",
        progress: {},
        challengeCourseId: creatorChallengeCourseId,
        challengeProjectId: creatorChallengeProjectId,
      },
    });

    // Calculate initial points for creator
    if (creatorChallengeCourseId) {
      try {
        const { calculateChallengePoints, updateChallengeRankings } = await import("../../../lib/EnhancedChallengeService");
        const points = await calculateChallengePoints(user.id, challenge.id);
        await prisma.challengeParticipant.update({
          where: { id: creatorParticipant.id },
          data: { points },
        });
        await updateChallengeRankings(challenge.id);
      } catch (error) {
        console.error("Error calculating initial points for creator:", error);
      }
    }

    // Create invitations
    const invites: Array<{ toUserId: string; challengeId: string; expiresAt: Date }> = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    if (groupId) {
      // Get all group members
      const groupMembers = await prisma.groupMembership.findMany({
        where: {
          groupId,
          leftAt: null,
          userId: {
            not: user.id, // Don't invite creator
          },
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      for (const member of groupMembers) {
        invites.push({
          challengeId: challenge.id,
          fromUserId: user.id,
          toUserId: member.user.id,
          status: "PENDING",
          expiresAt,
        });
      }
    } else if (userIds && userIds.length > 0) {
      // Invite specific users
      for (const userId of userIds) {
        if (userId === user.id) continue; // Don't invite self
        invites.push({
          challengeId: challenge.id,
          fromUserId: user.id,
          toUserId: userId,
          status: "PENDING",
          expiresAt,
        });
      }
    }

    // Create all invites
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
      try {
        const { createNotification } = await import("../../../lib/NotificationHelper");
        for (let i = 0; i < createdInvites.length; i++) {
          const invite = createdInvites[i];
          await createNotification(invite.toUserId, "CHALLENGE_INVITE", {
            inviteId: invite.id,
            challengeId: challenge.id,
            challengeName: challenge.name,
            fromUserId: user.id,
            fromUserName: user.userName,
          });
        }
      } catch (error) {
        console.error("Error sending notifications:", error);
      }
    }

    return NextResponse.json({ success: true, data: challenge }, { status: 201 });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create challenge" },
      { status: 500 }
    );
  }
}


