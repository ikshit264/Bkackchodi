/**
 * GET /api/challenges/requests - Get challenge requests
 * POST /api/challenges/requests - Create challenge request (for members)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { GetUserByUserId } from "../../../../components/actions/user/index";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    // If groupId provided, get requests for that group
    if (groupId) {
      where.groupId = groupId;
      // Check if user is owner/admin of the group
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { ownerId: true },
      });
      if (group?.ownerId === user.id) {
        // Owner can see all requests for their group
      } else {
        // Regular members can only see their own requests
        where.requestedBy = user.id;
      }
    } else {
      // Get all requests where user is requester or group owner/admin
      const userGroups = await prisma.group.findMany({
        where: {
          OR: [
            { ownerId: user.id },
            {
              members: {
                some: {
                  userId: user.id,
                  role: { in: ["OWNER", "ADMIN"] },
                  leftAt: null,
                },
              },
            },
          ],
        },
        select: { id: true },
      });
      const groupIds = userGroups.map((g) => g.id);

      where.OR = [
        { requestedBy: user.id },
        { groupId: { in: groupIds } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const requests = await prisma.challengeRequest.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching challenge requests:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

