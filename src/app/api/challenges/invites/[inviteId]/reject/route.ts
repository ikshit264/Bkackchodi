/**
 * POST /api/challenges/invites/[inviteId]/reject - Reject challenge invite
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../../lib/prisma";
import { GetUserByUserId } from "../../../../../../components/actions/user/index";

export async function POST(
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

    // Get invite
    const invite = await prisma.challengeInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invite not found" },
        { status: 404 }
      );
    }

    if (invite.toUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: "This invite is not for you" },
        { status: 403 }
      );
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Invite has already been processed" },
        { status: 400 }
      );
    }

    // Update invite status
    await prisma.challengeInvite.update({
      where: { id: inviteId },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ success: true, message: "Invite rejected" });
  } catch (error) {
    console.error("Error rejecting challenge invite:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to reject invite" },
      { status: 500 }
    );
  }
}

