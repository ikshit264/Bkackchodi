/**
 * Groups API - POST sync GroupScores
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { syncGroupScoreSchema } from "../../../../../lib/validations/groups";
import {
  syncUserGroupScores,
  syncAllGroupScores,
} from "../../../../../lib/GroupScoreSync";
import type { ApiResponse } from "../../../../../types/groups";
import { prisma } from "../../../../../../lib/prisma";

/**
 * POST /api/groups/score/sync
 * Sync GroupScores from global Score (for authenticated user or all users if admin)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = syncGroupScoreSchema.safeParse(body);
    const { userId: targetUserId } = validation.success
      ? validation.data
      : { userId: undefined };

    // Get user from DB
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json<ApiResponse<never>>(
        {
          error: "User not found in database",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Check if admin (simplified - you can add proper admin check)
    const isAdmin = request.headers.get("x-admin-key") === process.env.ADMIN_KEY;

    if (targetUserId && !isAdmin) {
      // Regular users can only sync their own scores
      if (targetUserId !== dbUser.id) {
        return NextResponse.json<ApiResponse<never>>(
          {
            error: "Forbidden - Cannot sync other user's scores",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      // Sync single user
      const result = await syncUserGroupScores(dbUser.id, true);

      return NextResponse.json<ApiResponse<typeof result>>(
        {
          data: result,
        },
        { status: 200 }
      );
    } else if (isAdmin && !targetUserId) {
      // Admin can sync all users
      const result = await syncAllGroupScores();

      return NextResponse.json<ApiResponse<typeof result>>(
        {
          data: result,
        },
        { status: 200 }
      );
    } else {
      // Default: sync current user
      const result = await syncUserGroupScores(dbUser.id, true);

      return NextResponse.json<ApiResponse<typeof result>>(
        {
          data: result,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error syncing group scores:", error);
    return NextResponse.json<ApiResponse<never>>(
      {
        error: "Failed to sync group scores",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

