/**
 * PATCH /api/user/profile/location
 * Update user location
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateUserLocation } from "../../../../../lib/LocationService";
import { GetUserByUserId } from "../../../../../components/actions/user/index";

export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await GetUserByUserId(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { country, city, region, timezone } = body;

    await updateUserLocation(user.id, {
      country,
      city,
      region,
      timezone,
    });

    return NextResponse.json({
      success: true,
      message: "Location updated successfully",
    });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update location" },
      { status: 500 }
    );
  }
}


