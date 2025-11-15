/**
 * User Sectors API - Redirects to User Groups API (filtered by type=CATEGORY)
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    // Get user's groups and filter by type=CATEGORY
    const response = await fetch(`${url.origin}/api/groups/my`, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user groups" },
        { status: response.status }
      );
    }

    const groupsData = await response.json();
    const categoryGroups = (groupsData.data || []).filter(
      (group: { type: string }) => group.type === "CATEGORY"
    );

    return NextResponse.json({
      data: categoryGroups,
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user sectors:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
