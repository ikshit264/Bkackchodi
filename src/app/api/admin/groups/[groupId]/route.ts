/**
 * Admin API - Get detailed group information
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../../utils/admin";
import { prisma } from "../../../../../../lib/prisma";

/**
 * GET /api/admin/groups/[groupId]
 * Get detailed group information (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const { groupId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: {
            id: true,
            userName: true,
            name: true,
            email: true,
          },
        },
        members: {
          where: {
            leftAt: null, // Only active members
          },
          include: {
            user: {
              include: {
                score: true,
              },
            },
          },
          orderBy: {
            joinedAt: "desc",
          },
        },
        scores: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                name: true,
              },
            },
          },
          orderBy: {
            finalScore: "desc",
          },
        },
        courses: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                name: true,
              },
            },
            batch: {
              include: {
                projects: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    position: true,
                  },
                },
              },
              orderBy: {
                number: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            members: {
              where: {
                leftAt: null,
              },
            },
            courses: true,
            scores: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: group }, { status: 200 });
  } catch (error) {
    console.error("Error fetching group details:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: "Failed to fetch group details", 
        code: "INTERNAL_ERROR",
        details: errorMessage,
        ...(process.env.NODE_ENV === "development" && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/groups/[groupId]
 * Update group (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const { groupId } = await params;
    const body = await request.json();
    const { name, description, icon, type, isPrivate } = body;

    const updateData: { name?: string; description?: string; icon?: string; type?: "CUSTOM" | "CATEGORY"; isPrivate?: boolean } = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (type !== undefined) updateData.type = (type === "CATEGORY" ? "CATEGORY" : "CUSTOM");
    // Category groups must be public
    if (isPrivate !== undefined && type !== "CATEGORY") {
      updateData.isPrivate = isPrivate;
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            userName: true,
            name: true,
            email: true,
          },
        },
        members: {
          where: { leftAt: null },
          include: {
            user: {
              include: {
                score: true,
              },
            },
          },
        },
        scores: true,
        courses: true,
        _count: {
          select: {
            members: { where: { leftAt: null } },
            courses: true,
            scores: true,
          },
        },
      },
    });

    return NextResponse.json({ data: updatedGroup, success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      { error: "Failed to update group", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

