/**
 * GET /api/badges
 * List all badges
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const rarity = searchParams.get("rarity");

    const where: { category?: string; rarity?: string } = {};
    if (category) {
      where.category = category;
    }
    if (rarity) {
      where.rarity = rarity;
    }

    const badges = await prisma.badge.findMany({
      where,
      orderBy: [
        { rarity: "asc" },
        { category: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ success: true, data: badges });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch badges" },
      { status: 500 }
    );
  }
}


