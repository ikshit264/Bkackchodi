import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ inviteId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { inviteId } = await params;
    console.log("[groups.invites.reject] inviteId=", inviteId);
    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const invite = await prisma.groupInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.toUserId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (invite.status !== "PENDING") return NextResponse.json({ error: "Invite not pending" }, { status: 400 });

    await prisma.groupInvite.update({ where: { id: inviteId }, data: { status: "REJECTED" } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Reject group invite error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


