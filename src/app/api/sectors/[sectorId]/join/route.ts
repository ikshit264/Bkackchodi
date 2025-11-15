/**
 * Join Sector API - Redirects to Groups Join API
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sectorId: string }> }
) {
  try {
    const { sectorId } = await params;
    const url = new URL(request.url);
    
    const response = await fetch(`${url.origin}/api/groups/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(request.headers.entries()),
      },
      body: JSON.stringify({ groupId: sectorId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error joining sector:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
