/**
 * Initialize Sectors API - Redirects to Admin Groups Init Categories API
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    const response = await fetch(`${url.origin}/api/admin/groups/init-categories`, {
      method: "POST",
      headers: {
        ...Object.fromEntries(request.headers.entries()),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error initializing sectors:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
