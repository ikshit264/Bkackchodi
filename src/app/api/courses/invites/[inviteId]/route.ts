import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { inviteId } = await params;

    // Get user to check permissions
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const invite = await prisma.courseInvite.findUnique({
      where: { id: inviteId },
      include: {
        fromUser: { select: { id: true } },
        toUser: { select: { id: true } },
      },
    });

    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    // Only sender or receiver can view invite details
    if (invite.fromUserId !== user.id && invite.toUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      {
        data: {
          id: invite.id,
          status: invite.status,
          expiresAt: invite.expiresAt,
          access: invite.access,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get course invite error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
