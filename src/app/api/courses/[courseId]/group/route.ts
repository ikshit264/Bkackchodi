import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../../lib/prisma";
import { updateGroupScore } from "../../../../../lib/GroupScoreCalculator";
import { updateGlobalScore } from "../../../../../lib/GlobalScoreCalculator";

const prisma = getPrismaClient();

export async function PUT(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { courseId } = await params;
    const { groupId } = await request.json();
    if (groupId === undefined) return NextResponse.json({ error: "groupId is required" }, { status: 400 });

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { userId: true, groupId: true } });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const isOwner = course.userId === me.id;
    const hasManager = await prisma.courseAccess.findFirst({ where: { courseId, userId: me.id, access: "MANAGER" } });
    const isAdmin = (await import("../../../../../utils/admin")).isAdmin;
    const admin = await isAdmin();
    if (!(isOwner || hasManager || admin)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const prevGroupId = course.groupId;
    const updated = await prisma.course.update({ where: { id: courseId }, data: { groupId } });

    // Trigger score recalcs for owner
    try {
      if (prevGroupId) await updateGroupScore(updated.userId, prevGroupId);
      if (groupId) await updateGroupScore(updated.userId, groupId);
      await updateGlobalScore(updated.userId, true);
    } catch (e) {
      console.error("Score recalculation failed (non-blocking):", e);
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error("Change course group error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


