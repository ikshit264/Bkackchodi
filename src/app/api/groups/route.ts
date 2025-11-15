import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import getPrismaClient from "../../../lib/prisma";
import { createGroupSchema } from "../../../lib/validations/groups";

const prisma = getPrismaClient();

// List groups (default: public only). If authenticated and admin, can request all.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCounts = searchParams.get("includeCounts") === "true";
    const type = searchParams.get("type"); // Filter by type: CUSTOM or CATEGORY
    const all = searchParams.get("all") === "true"; // Admin: show all including private
    const search = searchParams.get("search"); // Search by name or description
    const isPrivateFilter = searchParams.get("isPrivate"); // Filter by privacy: "true" or "false"
    const sort = searchParams.get("sort") || "created"; // Sort: "name", "created", "members"
    const page = parseInt(searchParams.get("page") || "1", 10); // Page number (1-indexed)
    const limit = parseInt(searchParams.get("limit") || "20", 10); // Items per page
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      isPrivate?: boolean;
      type?: string;
      isDeleted?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        description?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      isDeleted: false, // Exclude deleted groups
    };
    
    if (!all) {
      where.isPrivate = false; // Only show public groups by default
    }
    
    if (type) {
      where.type = type; // Filter by type if specified
    }
    
    if (isPrivateFilter === "true" || isPrivateFilter === "false") {
      where.isPrivate = isPrivateFilter === "true";
    }
    
    // Search functionality
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.group.count({ where });

    let groups = await prisma.group.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        icon: true,
        isPrivate: true,
        createdAt: true,
        updatedAt: true,
        _count: includeCounts
          ? { select: { members: { where: { leftAt: null } }, courses: true } }
          : undefined,
      },
      orderBy: 
        sort === "name" 
          ? { name: "asc" }
          : sort === "members"
          ? { _count: { members: { where: { leftAt: null } } } }
          : type === "CATEGORY" 
          ? { name: "asc" } // Alphabetical for categories
          : { createdAt: "desc" }, // Recent first for custom groups
      skip,
      take: limit,
    });

    // Ensure at least one public group exists for onboarding (idempotent)
    if (groups.length === 0) {
      await prisma.group.upsert({
        where: { name: "Global" },
        update: {},
        create: {
          name: "Global",
          description: "Default public group for all users",
          isPrivate: false,
        },
      });

      groups = await prisma.group.findMany({
        where: { isPrivate: false, isDeleted: false },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: includeCounts
            ? { select: { members: { where: { leftAt: null } }, courses: true } }
            : undefined,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Attach a `global` flag for consumers expecting it
    const shaped = groups.map((g) => ({
      ...g,
      // mark the default public group as global
      global: g.name?.toLowerCase() === "global",
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Return paginated response
    return NextResponse.json({ 
      data: shaped, 
      groups: shaped, // For backward compatibility
      success: true,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("List groups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create private group (owner = current user)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const body = await request.json();
    
    // Validate input
    const validation = createGroupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    const { name, description, type, icon, isPrivate } = validation.data;

    const dbUser = await prisma.user.findUnique({ where: { clerkId: me.id }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Check if group name already exists
    const existingGroup = await prisma.group.findUnique({
      where: { name: name.trim() },
      select: { id: true, isDeleted: true },
    });

    if (existingGroup && !existingGroup.isDeleted) {
      return NextResponse.json(
        { error: "Group name already exists. Please choose a different name." },
        { status: 409 }
      );
    }

    // Only admins can create category groups
    const groupType = type === "CATEGORY" ? "CATEGORY" : "CUSTOM";
    if (groupType === "CATEGORY") {
      const { isAdmin } = await import("../../../utils/admin");
      const admin = await isAdmin();
      if (!admin) {
        return NextResponse.json(
          { error: "Only admins can create category groups" },
          { status: 403 }
        );
      }
    }

    try {
      const group = await prisma.group.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          type: groupType,
          icon: icon?.trim() || null,
          isPrivate: groupType === "CATEGORY" ? false : (isPrivate !== undefined ? isPrivate : true),
          ownerId: dbUser.id,
          creatorId: dbUser.id,
          members: {
            create: { userId: dbUser.id, role: "OWNER" },
          },
        },
        include: {
          members: true,
        },
      });

      // Create GroupScore for the owner so they appear in leaderboard and analytics
      try {
        const { updateGroupScore } = await import("../../../lib/GroupScoreCalculator");
        await updateGroupScore(dbUser.id, group.id);
      } catch (error) {
        console.error("Error creating GroupScore for group owner:", error);
        // Don't fail group creation if score calculation fails
      }

      // Track group creation contribution
      try {
        const { trackContribution } = await import("../../../lib/ContributionService");
        const contributionType = groupType === "CATEGORY" ? "SECTOR_JOINED" : "GROUP_JOINED";
        await trackContribution(
          dbUser.id,
          contributionType,
          { groupId: group.id, groupType: groupType }
        );
      } catch (error) {
        console.error("Error tracking group creation contribution:", error);
        // Don't fail group creation if contribution tracking fails
      }

      return NextResponse.json({ data: group }, { status: 201 });
    } catch (error) {
      // Handle unique constraint violation
      const prismaError = error as { code?: string; meta?: { target?: string[] } };
      if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("name")) {
        return NextResponse.json(
          { error: "Group name already exists. Please choose a different name." },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
