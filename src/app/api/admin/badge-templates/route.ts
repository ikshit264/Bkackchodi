/**
 * Admin API for Badge Templates
 * GET: List all badge templates
 * POST: Create new badge template (with AI parsing support)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { parseBadgeCriteria } from "../../../../lib/AIBadgeParser";
import { BadgeCategory, BadgeRarity } from "@prisma/client";
import { GetUserByUserId } from "../../../../components/actions/user/index";

// Helper to check if user is admin
async function isAdmin() {
  // TODO: Implement admin check
  return false;
}

/**
 * GET /api/admin/badge-templates
 * Get all badge templates
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const templates = await prisma.badgeTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("Error fetching badge templates:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/badge-templates
 * Create new badge template
 * Body: {
 *   name: string,
 *   description: string,
 *   image?: string,
 *   icon?: string,
 *   category: BadgeCategory,
 *   rarity: BadgeRarity,
 *   naturalLanguageQuery?: string, // If provided, AI will parse this
 *   conditionType?: string, // Manual override
 *   conditionValue?: any, // Manual override
 *   criteria?: any // Manual override
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const user = await GetUserByUserId(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      image,
      icon,
      category,
      rarity,
      naturalLanguageQuery,
      conditionType,
      conditionValue,
      criteria,
    } = body;

    if (!name || !description || !category || !rarity) {
      return NextResponse.json(
        { error: "Missing required fields: name, description, category, rarity" },
        { status: 400 }
      );
    }

    let finalConditionType = conditionType;
    let finalConditionValue = conditionValue;
    let finalCriteria = criteria;

    // If natural language query provided, use AI to parse
    if (naturalLanguageQuery && !conditionType && !criteria) {
      try {
        const parsed = await parseBadgeCriteria(naturalLanguageQuery, user.id);
        finalConditionType = parsed.conditionType;
        finalConditionValue = parsed.conditionValue;
        finalCriteria = parsed.criteria;
        
        // Override category and rarity if not provided
        if (!category) {
          body.category = parsed.category as BadgeCategory;
        }
        if (!rarity) {
          body.rarity = parsed.rarity as BadgeRarity;
        }
      } catch (error) {
        return NextResponse.json(
          { error: `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    if (!finalConditionType || !finalConditionValue || !finalCriteria) {
      return NextResponse.json(
        { error: "Must provide either naturalLanguageQuery or conditionType/conditionValue/criteria" },
        { status: 400 }
      );
    }

    // Create badge template
    const template = await prisma.badgeTemplate.create({
      data: {
        name,
        description,
        image: image || null,
        icon: icon || null,
        category: category as BadgeCategory,
        rarity: rarity as BadgeRarity,
        conditionType: finalConditionType,
        conditionValue: finalConditionValue,
        criteria: finalCriteria,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error("Error creating badge template:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create template" },
      { status: 500 }
    );
  }
}


