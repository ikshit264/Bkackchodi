/**
 * Notification Helper
 * Simple helper to create notifications
 */

import { prisma } from "./prisma";

export async function createNotification(
  userId: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        recipientUserId: userId,
        type,
        data,
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - notifications are not critical
  }
}

