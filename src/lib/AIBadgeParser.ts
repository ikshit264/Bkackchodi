/**
 * AI Badge Parser Service
 * Uses Gemini AI to parse natural language queries into badge criteria JSON
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";

const BADGE_PARSER_PROMPT = `You are a badge criteria parser for a project-based learning platform. Your task is to convert natural language badge requirements into a structured JSON format.

## Available User Metrics:
- **streak**: Current streak in days (from Score model)
- **longestStreak**: Longest streak achieved
- **totalActiveDays**: Total active days
- **commits**: Total GitHub commits
- **pullRequests**: Total pull requests created
- **reviews**: Total code reviews done
- **issues**: Total issues created/closed
- **projectsCompleted**: Count of projects with status "completed"
- **projectsStarted**: Count of projects with status != "not started"
- **coursesCompleted**: Count of courses with status "completed"
- **coursesStarted**: Count of courses with status != "not started"
- **globalRank**: User's global rank (lower is better, 1 is top)
- **groupRank**: User's rank in any group (lower is better)
- **perfectScore**: Boolean - has any project with aiEvaluationScore = 100
- **loginDays**: Total days user has logged in (can be calculated from createdAt and activity)
- **consecutiveLoginDays**: Consecutive days logged in

## Badge Categories:
- PROJECTS: Related to projects
- STREAKS: Related to streaks
- GITHUB: Related to GitHub activity
- GROUP: Related to group rankings
- COURSE: Related to courses
- MILESTONE: Major achievements

## Badge Rarity:
- COMMON: Easy to achieve
- RARE: Moderate difficulty
- EPIC: Hard to achieve
- LEGENDARY: Very hard to achieve

## Output Format:
You must return ONLY valid JSON in this exact format:
{
  "conditionType": "string (e.g., 'streak', 'projects_completed', 'commits', 'login_days')",
  "conditionValue": { "key": value }, // e.g., { "days": 100 }, { "count": 50 }
  "criteria": {
    "metricName": threshold, // e.g., { "streak": 100 }, { "projectsCompleted": 50 }
    // Can include multiple conditions with AND logic
  },
  "category": "PROJECTS | STREAKS | GITHUB | GROUP | COURSE | MILESTONE",
  "rarity": "COMMON | RARE | EPIC | LEGENDARY"
}

## Examples:

Input: "Badge for 100 day streak"
Output:
{
  "conditionType": "streak",
  "conditionValue": { "days": 100 },
  "criteria": { "streak": 100 },
  "category": "STREAKS",
  "rarity": "RARE"
}

Input: "Complete 50 projects"
Output:
{
  "conditionType": "projects_completed",
  "conditionValue": { "count": 50 },
  "criteria": { "projectsCompleted": 50 },
  "category": "PROJECTS",
  "rarity": "RARE"
}

Input: "Make 200 commits on GitHub"
Output:
{
  "conditionType": "commits",
  "conditionValue": { "count": 200 },
  "criteria": { "commits": 200 },
  "category": "GITHUB",
  "rarity": "COMMON"
}

Input: "Login for 365 consecutive days"
Output:
{
  "conditionType": "login_days",
  "conditionValue": { "days": 365 },
  "criteria": { "consecutiveLoginDays": 365 },
  "category": "MILESTONE",
  "rarity": "LEGENDARY"
}

Input: "Rank in top 10 globally"
Output:
{
  "conditionType": "global_rank",
  "conditionValue": { "rank": 10 },
  "criteria": { "globalRank": 10 },
  "category": "MILESTONE",
  "rarity": "EPIC"
}

Input: "Complete 5 courses"
Output:
{
  "conditionType": "courses_completed",
  "conditionValue": { "count": 5 },
  "criteria": { "coursesCompleted": 5 },
  "category": "COURSE",
  "rarity": "COMMON"
}

## Important Rules:
1. Return ONLY valid JSON, no markdown, no explanations
2. Infer appropriate rarity based on difficulty (100 days = RARE, 365 days = LEGENDARY)
3. Use the exact metric names from the Available User Metrics list
4. For milestones like "100 days", "200 days", "365 days" - use STREAKS or MILESTONE category
5. Always include conditionType, conditionValue, criteria, category, and rarity
6. If multiple conditions, combine them in criteria with AND logic

Now parse this badge requirement:`;

/**
 * Parse natural language badge requirement into structured criteria
 */
export async function parseBadgeCriteria(
  naturalLanguageQuery: string,
  userId?: string
): Promise<{
  conditionType: string;
  conditionValue: Record<string, any>;
  criteria: Record<string, any>;
  category: string;
  rarity: string;
}> {
  try {
    // Get user's Gemini API key
    let geminiApiKey: string | null = null;
    
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { geminiApiKey: true },
      });
      geminiApiKey = user?.geminiApiKey || null;
    }

    // If no user key, try to get from environment (admin fallback)
    if (!geminiApiKey) {
      geminiApiKey = process.env.GEMINI_API_KEY || null;
    }

    if (!geminiApiKey) {
      throw new Error("Gemini API key not found. Please set it in your profile or environment.");
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Create full prompt
    const fullPrompt = `${BADGE_PARSER_PROMPT}\n\n"${naturalLanguageQuery}"`;

    // Generate response
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    // Parse JSON
    const parsed = JSON.parse(jsonText);

    // Validate required fields
    if (!parsed.conditionType || !parsed.conditionValue || !parsed.criteria || !parsed.category || !parsed.rarity) {
      throw new Error("Invalid badge criteria format. Missing required fields.");
    }

    return {
      conditionType: parsed.conditionType,
      conditionValue: parsed.conditionValue,
      criteria: parsed.criteria,
      category: parsed.category,
      rarity: parsed.rarity,
    };
  } catch (error) {
    console.error("Error parsing badge criteria with AI:", error);
    throw new Error(
      `Failed to parse badge criteria: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}


