/**
 * Sector Detail API - Redirects to Groups API
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectorId: string }> }
) {
  try {
    const { sectorId } = await params;
    const url = new URL(request.url);
    
    const response = await fetch(`${url.origin}/api/groups/${sectorId}`, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Sector not found" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching sector:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
