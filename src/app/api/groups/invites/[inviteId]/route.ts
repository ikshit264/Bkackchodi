import { NextRequest, NextResponse } from "next/server";
import getPrismaClient from "../../../../../lib/prisma";

const prisma = getPrismaClient();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ inviteId: string }> }) {
  try {
    const { inviteId } = await params;
    const invite = await prisma.groupInvite.findUnique({ where: { id: inviteId }, select: { id: true, status: true, expiresAt: true } });
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    return NextResponse.json({ data: invite }, { status: 200 });
  } catch (error) {
    console.error("Get group invite error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


