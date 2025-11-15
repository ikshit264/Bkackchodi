/**
 * Course Access Middleware
 * Provides consistent access checking for course routes
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../prisma";
import { CourseAccessLevel } from "@prisma/client";
import { validateCourseAccess } from "../SharingService";

export interface CourseAccessContext {
  userId: string;
  courseId: string;
  accessLevel: "OWNER" | CourseAccessLevel | null;
  canAccess: boolean;
}

/**
 * Check if user can access course
 */
export async function checkCourseAccess(
  userId: string,
  courseId: string
): Promise<CourseAccessContext | null> {
  const validation = await validateCourseAccess(userId, courseId);

  if (!validation.canAccess) {
    return null;
  }

  return {
    userId,
    courseId,
    accessLevel: validation.accessLevel as any,
    canAccess: true,
  };
}

/**
 * Require course access middleware
 */
export async function requireCourseAccess(
  request: NextRequest,
  courseId: string,
  requiredAccess?: CourseAccessLevel | "OWNER"
): Promise<CourseAccessContext | NextResponse> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const context = await checkCourseAccess(user.id, courseId);
  if (!context) {
    return NextResponse.json(
      { error: "Access denied", reason: "You do not have access to this course" },
      { status: 403 }
    );
  }

  if (requiredAccess) {
    if (context.accessLevel === "OWNER") {
      return context;
    }

    const accessHierarchy: Record<CourseAccessLevel, number> = {
      READ_ONLY: 1,
      COPY: 2,
      SYNC_COPY: 3,
    };

    const requiredLevel = accessHierarchy[requiredAccess];
    const userLevel = context.accessLevel ? accessHierarchy[context.accessLevel] : 0;

    if (userLevel < requiredLevel) {
      return NextResponse.json(
        { error: "Insufficient permissions", reason: `Requires ${requiredAccess} access` },
        { status: 403 }
      );
    }
  }

  return context;
}


