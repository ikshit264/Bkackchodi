/**
 * Admin API - Check if user is admin
 */
import { NextResponse } from "next/server";
import { isAdmin } from "../../../../utils/admin";

/**
 * GET /api/admin/check
 * Check if current user is admin
 */
export async function GET() {
  try {
    const admin = await isAdmin();
    return NextResponse.json({ isAdmin: admin }, { status: 200 });
  } catch {
    return NextResponse.json(
      { isAdmin: false, error: "Failed to check admin status" },
      { status: 500 }
    );
  }
}

