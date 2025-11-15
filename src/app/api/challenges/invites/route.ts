/**
 * GET /api/challenges/invites - Get user's challenge invites
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
    const status = searchParams.get("status") || "PENDING";

    const invites = await prisma.challengeInvite.findMany({
      where: {
        toUserId: user.id,
        status: status as "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED",
        expiresAt: {
          gte: new Date(), // Not expired
        },
      },
      include: {
        challenge: {
          include: {
            creator: {
              select: {
                id: true,
                userName: true,
                name: true,
                lastName: true,
                avatar: true,
              },
            },
            course: {
              select: {
                id: true,
                title: true,
              },
            },
            project: {
              select: {
                id: true,
                title: true,
              },
            },
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        fromUser: {
          select: {
            id: true,
            userName: true,
            name: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: invites });
  } catch (error) {
    console.error("Error fetching challenge invites:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch invites" },
      { status: 500 }
    );
  }
}

