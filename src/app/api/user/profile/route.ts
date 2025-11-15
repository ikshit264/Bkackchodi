import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";

/**
 * PATCH /api/user/profile
 * Update user profile details (name, lastName, collegeName, graduationYear, avatar)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, lastName, collegeName, graduationYear, avatar, country, city, region, timezone } = body;

    console.log("[Profile Update API] Received request:", { userId, name, lastName, collegeName, graduationYear, avatar: avatar ? "provided" : "not provided" });

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: { name?: string; lastName?: string; avatar?: string; bio?: string; location?: string } = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName;
    }
    if (collegeName !== undefined) {
      updateData.collegeName = collegeName || null;
    }
    if (graduationYear !== undefined) {
      updateData.graduationYear = graduationYear ? parseInt(graduationYear) : null;
    }
    if (avatar !== undefined) {
      updateData.avatar = avatar || null;
    }
    if (country !== undefined) {
      updateData.country = country || null;
    }
    if (city !== undefined) {
      updateData.city = city || null;
    }
    if (region !== undefined) {
      updateData.region = region || null;
    }
    if (timezone !== undefined) {
      updateData.timezone = timezone || null;
    }

    console.log("[Profile Update API] Updating user with data:", updateData);

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: updateData,
    });

    console.log("[Profile Update API] Successfully updated user profile");

    return NextResponse.json(
      { 
        success: true, 
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          lastName: updatedUser.lastName,
          collegeName: updatedUser.collegeName,
          graduationYear: updatedUser.graduationYear,
          avatar: updatedUser.avatar,
          country: updatedUser.country,
          city: updatedUser.city,
          region: updatedUser.region,
          timezone: updatedUser.timezone,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Profile Update API] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to update profile. Please try again.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

