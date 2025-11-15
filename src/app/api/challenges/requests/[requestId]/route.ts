/**
 * GET /api/challenges/requests/[requestId] - Get a single challenge request
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../components/actions/user/index";

export async function GET(
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

    const challengeRequest = await prisma.challengeRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: {
            id: true,
            userName: true,
            name: true,
            lastName: true,
            avatar: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        challenge: {
          select: {
            id: true,
            name: true,
            status: true,
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

    // Check if user has permission to view this request
    const isRequester = challengeRequest.requestedBy === user.id;
    const isOwner = challengeRequest.group.ownerId === user.id;
    
    if (!isRequester && !isOwner) {
      // Check if user is admin of the group
      const membership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: challengeRequest.groupId,
          },
        },
      });

      if (!membership || membership.leftAt || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
        return NextResponse.json(
          { success: false, error: "Unauthorized to view this request" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: challengeRequest });
  } catch (error) {
    console.error("Error fetching challenge request:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch request" },
      { status: 500 }
    );
  }
}

