/**
 * POST /api/admin/groups/init-categories
 * Initialize default category groups (admin only)
 */

import { NextResponse } from "next/server";
import { isAdmin } from "../../../../../utils/admin";
import { initializeDefaultCategoryGroups } from "../../../../../lib/GroupService";

export async function POST() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    const count = await initializeDefaultCategoryGroups();

    return NextResponse.json({
      success: true,
      message: `Initialized ${count} category groups`,
      count,
    });
  } catch (error) {
    console.error("Error initializing category groups:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initialize category groups" },
      { status: 500 }
    );
  }
}


