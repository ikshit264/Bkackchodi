/**
 * POST /api/challenges/requests/[requestId]/reject - Reject challenge request
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../../components/actions/user/index";

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
        { success: false, error: "Only group owners/admins can reject challenge requests" },
        { status: 403 }
      );
    }

    // Update request status
    await prisma.challengeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });

    // Notify requester
    try {
      const { createNotification } = await import("../../../../../../lib/NotificationHelper");
      await createNotification(challengeRequest.requestedBy, "CHALLENGE_REQUEST_REJECTED", {
        requestId: challengeRequest.id,
        challengeName: challengeRequest.name,
        groupId: challengeRequest.groupId,
        groupName: challengeRequest.group.name,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }

    return NextResponse.json({ success: true, message: "Challenge request rejected" });
  } catch (error) {
    console.error("Error rejecting challenge request:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to reject request" },
      { status: 500 }
    );
  }
}

