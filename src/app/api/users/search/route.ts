/**
 * GET /api/users/search - Search users by username or name
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    // Support both 'q' and 'query' parameters for compatibility
    const query = searchParams.get("q") || searchParams.get("query");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: false, error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { userName: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        userName: true,
        name: true,
        lastName: true,
        avatar: true,
        email: true,
      },
      take: limit, // Limit results (default 20, can be overridden)
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to search users" },
      { status: 500 }
    );
  }
}
