/**
 * GroupScore Sync Helper
 * DEPRECATED: Use GroupScoreCalculator instead for new calculation method
 * This file is kept for backward compatibility during migration
 */
import { prisma } from "../../lib/prisma";
import { updateGroupScore } from "./GroupScoreCalculator";

/**
 * Sync a user's GroupScores using the new calculation method
 * @param userId - User ID to sync scores for
 * @param forceUpdate - If true, recalculate all group scores
 */
export async function syncUserGroupScores(
  userId: string,
  forceUpdate: boolean = false
): Promise<{
  synced: number;
  created: number;
  errors: string[];
}> {
  const result = {
    synced: 0,
    created: 0,
    errors: [] as string[],
  };

  try {
    // Get all active group memberships for this user
    const memberships = await prisma.groupMembership.findMany({
      where: {
        userId,
        leftAt: null, // Only active memberships
      },
      select: {
        groupId: true,
      },
    });

    if (memberships.length === 0) {
      return result;
    }

    // Recalculate each group score using new method
    for (const membership of memberships) {
      try {
        const existingGroupScore = await prisma.groupScore.findUnique({
          where: {
            userId_groupId: {
              userId,
              groupId: membership.groupId,
            },
          },
        });

        // Recalculate group score
        await updateGroupScore(userId, membership.groupId);

        if (existingGroupScore) {
          result.synced++;
        } else {
          result.created++;
        }
      } catch (error) {
        const errorMsg = `Failed to sync group ${membership.groupId}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        result.errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to sync user group scores: ${
      error instanceof Error ? error.message : String(error)
    }`;
    result.errors.push(errorMsg);
    console.error(errorMsg, error);
  }

  return result;
}

/**
 * Update ranks for all users in a group
 * Calculates ranks based on finalScore and assigns them
 */
export async function updateGroupRanks(groupId: string): Promise<void> {
  try {
    // Get all active group scores, sorted by finalScore descending
    const scores = await prisma.groupScore.findMany({
      where: {
        groupId,
        user: {
          groupMemberships: {
            some: {
              groupId,
              leftAt: null, // Only active members
            },
          },
        },
      },
      orderBy: [
        { finalScore: "desc" },
        { lastUpdatedDate: "desc" },
        { id: "asc" },
      ],
      select: {
        id: true,
      },
    });

    // Update ranks
    await Promise.all(
      scores.map((score, index) =>
        prisma.groupScore.update({
          where: { id: score.id },
          data: { rank: index + 1 },
        })
      )
    );
  } catch (error) {
    console.error(`Error updating ranks for group ${groupId}:`, error);
    throw error;
  }
}

/**
 * Sync all group scores for all active users (admin/bulk operation)
 */
export async function syncAllGroupScores(): Promise<{
  usersProcessed: number;
  totalSynced: number;
  totalCreated: number;
  errors: string[];
}> {
  const result = {
    usersProcessed: 0,
    totalSynced: 0,
    totalCreated: 0,
    errors: [] as string[],
  };

  try {
    // Get all users with active group memberships and global scores
    const users = await prisma.user.findMany({
      where: {
        score: {
          isNot: null,
        },
        groupMemberships: {
          some: {
            leftAt: null,
          },
        },
      },
      select: {
        id: true,
      },
    });

    for (const user of users) {
      try {
        const syncResult = await syncUserGroupScores(user.id, true);
        result.usersProcessed++;
        result.totalSynced += syncResult.synced;
        result.totalCreated += syncResult.created;
        result.errors.push(...syncResult.errors);
      } catch (error) {
        result.errors.push(
          `Failed to sync user ${user.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `Bulk sync failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}

