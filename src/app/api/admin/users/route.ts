/**
 * Admin API - Users management
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../utils/admin";
import { prisma } from "../../../../../lib/prisma";

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
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
        groupMemberships: {
          where: {
            leftAt: null,
          },
          include: {
            group: true,
          },
        },
        _count: {
          select: {
            courses: true,
            groupMemberships: {
              where: {
                leftAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: users }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

