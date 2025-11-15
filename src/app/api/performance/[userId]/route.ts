/**
 * GET /api/performance/[userId]
 * Get user performance data
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        score: true,
        courses: {
          include: {
            batch: {
              include: {
                projects: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.score) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching performance:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch performance" },
      { status: 500 }
    );
  }
}

