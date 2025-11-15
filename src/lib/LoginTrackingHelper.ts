/**
 * Login Tracking Helper
 * Centralized function to track user login across the application
 */

import { prisma } from "./prisma";
import { trackLogin } from "./UnifiedStreakService";

/**
 * Track login for a user (called from various API endpoints)
 * This ensures login is tracked whenever user accesses the app
 */
export async function trackUserLogin(clerkId: string): Promise<void> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (dbUser) {
      await trackLogin(dbUser.id).catch((err) => {
        console.error("Error tracking login:", err);
        // Don't throw - login tracking should not fail requests
      });
    }
  } catch (error) {
    console.error("Error in login tracking helper:", error);
    // Don't throw - continue even if tracking fails
  }
}












