/**
 * Group Service
 * Enhanced group service with category group support
 */

import { prisma } from "./prisma";
import { GroupType } from "@prisma/client";

/**
 * Initialize default category groups (formerly sectors)
 */
export async function initializeDefaultCategoryGroups() {
  const defaultCategories = [
    {
      name: "Web Development",
      description: "Frontend and backend web development technologies",
      icon: "🌐",
      type: GroupType.CATEGORY,
      isPrivate: false,
    },
    {
      name: "AI/ML",
      description: "Artificial Intelligence and Machine Learning",
      icon: "🤖",
      type: GroupType.CATEGORY,
      isPrivate: false,
    },
    {
      name: "Mobile Development",
      description: "iOS and Android mobile app development",
      icon: "📱",
      type: GroupType.CATEGORY,
      isPrivate: false,
    },
    {
      name: "DevOps",
      description: "DevOps, CI/CD, and infrastructure",
      icon: "⚙️",
      type: GroupType.CATEGORY,
      isPrivate: false,
    },
    {
      name: "Data Science",
      description: "Data analysis, visualization, and science",
      icon: "📊",
      type: GroupType.CATEGORY,
      isPrivate: false,
    },
    {
      name: "Cybersecurity",
      description: "Security, ethical hacking, and penetration testing",
      icon: "🔒",
      type: GroupType.CATEGORY,
      isPrivate: false,
    },
    {
      name: "Game Development",
      description: "Game design and development",
      icon: "🎮",
      type: GroupType.CATEGORY,
      isPrivate: false,
    },
    {
      name: "Blockchain",
      description: "Blockchain and cryptocurrency development",
      icon: "⛓️",
      type: GroupType.CATEGORY,
      isPrivate: false,
    },
  ];

  const created = [];
  for (const category of defaultCategories) {
    const group = await prisma.group.upsert({
      where: { name: category.name },
      update: {
        type: GroupType.CATEGORY,
        icon: category.icon,
        description: category.description,
        isPrivate: false,
      },
      create: category,
    });
    created.push(group);
  }

  return created.length;
}

/**
 * Get category groups (for sectors page)
 */
export async function getCategoryGroups() {
  return await prisma.group.findMany({
    where: {
      type: GroupType.CATEGORY,
      isPrivate: false,
      isDeleted: false,
    },
    include: {
      _count: {
        select: {
          members: {
            where: { leftAt: null },
          },
          courses: {
            where: { isDeleted: false },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

/**
 * Ensure Global group exists and return it
 */
export async function ensureGlobalGroup() {
  const globalGroup = await prisma.group.upsert({
    where: { name: "Global" },
    update: {
      isPrivate: false,
      isDeleted: false,
      type: GroupType.CUSTOM, // Global is a regular custom group
    },
    create: {
      name: "Global",
      description: "Default global group for all users. This is the highest level of competition.",
      type: GroupType.CUSTOM,
      isPrivate: false,
    },
  });

  return globalGroup;
}

/**
 * Auto-join user to Global group (called on signup)
 */
export async function autoJoinGlobalGroup(userId: string) {
  try {
    // Ensure Global group exists
    const globalGroup = await ensureGlobalGroup();

    // Check if user is already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: globalGroup.id,
        },
      },
    });

    if (existingMembership && !existingMembership.leftAt) {
      // Already a member
      return globalGroup;
    }

    // Create or restore membership
    await prisma.groupMembership.upsert({
      where: {
        userId_groupId: {
          userId,
          groupId: globalGroup.id,
        },
      },
      update: {
        leftAt: null, // Restore if they left
        joinedAt: existingMembership?.joinedAt || new Date(),
      },
      create: {
        userId,
        groupId: globalGroup.id,
        role: "MEMBER",
      },
    });

    // Initialize GroupScore for Global group
    await prisma.groupScore.upsert({
      where: {
        userId_groupId: {
          userId,
          groupId: globalGroup.id,
        },
      },
      update: {},
      create: {
        userId,
        groupId: globalGroup.id,
        finalScore: 0,
      },
    });

    return globalGroup;
  } catch (error) {
    console.error("Error auto-joining Global group:", error);
    throw error;
  }
}

