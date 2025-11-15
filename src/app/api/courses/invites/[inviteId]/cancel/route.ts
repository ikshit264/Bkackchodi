import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GetUserByUserId } from "../../../../../../components/actions/user/index";
import { cancelCourseInvite } from "../../../../../../lib/InviteService";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { inviteId } = await params;

    const user = await GetUserByUserId(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await cancelCourseInvite(inviteId, user.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Cancel course invite error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
