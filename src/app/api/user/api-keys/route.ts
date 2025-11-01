import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";

const prisma = getPrismaClient();

/**
 * GET - Fetch API keys for the authenticated user
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database using authenticated clerkId
    const user = await prisma.user.findFirst({
      where: { clerkId: userId },
      select: {
        id: true,
        geminiApiKey: true,
        groqApiKey: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      geminiApiKey: user.geminiApiKey || null,
      groqApiKey: user.groqApiKey || null,
    });
  } catch (err) {
    console.error("Error fetching API keys:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch API keys";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * POST - Update API keys for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { geminiApiKey, groqApiKey } = body;

    // Get user from database
    const user = await prisma.user.findFirst({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update API keys (only update provided keys)
    const updateData: { geminiApiKey?: string; groqApiKey?: string } = {};
    if (geminiApiKey !== undefined) {
      updateData.geminiApiKey = geminiApiKey || null;
    }
    if (groqApiKey !== undefined) {
      updateData.groqApiKey = groqApiKey || null;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating API keys:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to update API keys";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

