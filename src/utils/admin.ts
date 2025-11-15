/**
 * Admin utilities
 */
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../lib/prisma";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "ikshit264";

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) return false;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { userName: true },
    });

    return user?.userName === ADMIN_USERNAME;
  } catch {
    return false;
  }
}

/**
 * Get admin username from env
 */
export function getAdminUsername(): string {
  return ADMIN_USERNAME;
}

