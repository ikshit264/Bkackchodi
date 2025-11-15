import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../../../utils/admin";
import getPrismaClient from "../../../../../../lib/prisma";

const prisma = getPrismaClient();

export async function PUT(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { groupId } = await params;
    const { isPrivate } = await request.json();
    if (typeof isPrivate !== "boolean") return NextResponse.json({ error: "isPrivate boolean required" }, { status: 400 });

    const updated = await prisma.group.update({ where: { id: groupId }, data: { isPrivate } });
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error("Admin privacy toggle error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


