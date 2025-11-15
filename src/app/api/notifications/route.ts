import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../lib/prisma";

const prisma = getPrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // unread|all
    const page = Number(searchParams.get("page") || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const skip = (page - 1) * limit;

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const where: { recipientUserId: string; isRead?: boolean } = { recipientUserId: me.id };
    if (status === "unread") where.isRead = false;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({ data: items, page, limit, total }, { status: 200 });
  } catch (error) {
    console.error("List notifications error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json();
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.recipientUserId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


