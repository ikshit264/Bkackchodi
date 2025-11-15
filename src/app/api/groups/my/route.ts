import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";
import { isAdmin } from "../../../../utils/admin";

const prisma = getPrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const isPrivateFilter = searchParams.get("isPrivate");
    const sort = searchParams.get("sort") || "created";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const dbUser = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const admin = await isAdmin();

    // Build where clause
    const where: { 
      isDeleted: boolean; 
      members?: { some: { userId: string } }; 
      OR?: Array<{ ownerId: string } | { members: { some: { userId: string; leftAt: null } } }>;
    } = {
      isDeleted: false, // Exclude deleted groups
    };

    // Base membership filter (unless admin)
    if (!admin) {
      where.OR = [
        { ownerId: dbUser.id },
        {
          members: {
            some: { userId: dbUser.id, leftAt: null },
          },
        },
      ];
    }

    // Apply type filter
    if (type && type !== "ALL") {
      where.type = type;
    }

    // Apply privacy filter
    if (isPrivateFilter === "true") {
      where.isPrivate = true;
    } else if (isPrivateFilter === "false") {
      where.isPrivate = false;
    }

    // Apply search filter (only if search query is provided)
    if (search && search.trim()) {
      // If there's already an AND clause, merge it
      if (where.AND) {
        where.AND.push({
          OR: [
            { name: { contains: search.trim(), mode: "insensitive" } },
            { description: { contains: search.trim(), mode: "insensitive" } },
          ],
        });
      } else {
        where.AND = [
          {
            OR: [
              { name: { contains: search.trim(), mode: "insensitive" } },
              { description: { contains: search.trim(), mode: "insensitive" } },
            ],
          },
        ];
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.group.count({ where });

    // Build orderBy
    let orderBy: { createdAt?: "desc" | "asc"; name?: "asc" | "desc" } = { createdAt: "desc" };
    if (sort === "name") {
      orderBy = { name: "asc" };
    } else if (sort === "members") {
      // For member count sorting, we'll need to use a different approach
      orderBy = { createdAt: "desc" }; // Fallback for now
    }

    const groups = await prisma.group.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        isPrivate: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: { where: { leftAt: null } },
            courses: { where: { isDeleted: false } },
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    // If sorting by members, sort in memory (for now)
    if (sort === "members") {
      groups.sort((a, b) => (b._count?.members || 0) - (a._count?.members || 0));
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: groups,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("List my groups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


