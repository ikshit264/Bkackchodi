/**
 * Sectors API - Redirects to Groups API with type=CATEGORY
 * This maintains backward compatibility while using the unified Groups system
 */

import { NextRequest, NextResponse } from "next/server";

// GET /api/sectors - Get all category groups (formerly sectors)
export async function GET(request: NextRequest) {
  try {
    // Redirect to groups API with type filter
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    searchParams.set("type", "CATEGORY");
    searchParams.set("includeCounts", "true");
    
    const groupsUrl = `/api/groups?${searchParams.toString()}`;
    const response = await fetch(`${url.origin}${groupsUrl}`, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch category groups" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching sectors:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/sectors - Create category group (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${new URL(request.url).origin}/api/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(request.headers.entries()),
      },
      body: JSON.stringify({
        ...body,
        type: "CATEGORY",
        isPrivate: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating sector:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
