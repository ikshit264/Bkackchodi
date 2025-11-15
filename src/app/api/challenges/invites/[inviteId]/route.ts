/**
 * GET /api/challenges/invites/[inviteId] - Get a single challenge invite
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../components/actions/user/index";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
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

    const { inviteId } = await params;

    const invite = await prisma.challengeInvite.findUnique({
      where: { id: inviteId },
      include: {
        challenge: {
          include: {
            creator: {
              select: {
                id: true,
                userName: true,
                name: true,
                lastName: true,
                avatar: true,
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
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        fromUser: {
          select: {
            id: true,
            userName: true,
            name: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Challenge invite not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to view this invite
    if (invite.toUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to view this invite" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: invite });
  } catch (error) {
    console.error("Error fetching challenge invite:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch invite" },
      { status: 500 }
    );
  }
}

