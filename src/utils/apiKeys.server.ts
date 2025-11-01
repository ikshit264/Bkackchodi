import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../lib/prisma";

const prisma = getPrismaClient();

/**
 * Get Gemini API key for authenticated user
 * Priority: Database (user's key) > Environment variable (GEMINI_API_KEY2 or GEMINI_API_KEY_GITHUB)
 */
export async function getGeminiApiKeyServer(): Promise<string | null> {
  try {
    // Try to get from database first
    const { userId } = await auth();
    if (userId) {
      const user = await prisma.user.findFirst({
        where: { clerkId: userId },
        select: { geminiApiKey: true },
      });

      if (user?.geminiApiKey) {
        return user.geminiApiKey;
      }
    }
  } catch (error) {
    console.error("Error fetching Gemini API key from DB:", error);
  }

  // Fallback to environment variables
  return process.env.GEMINI_API_KEY2 || process.env.GEMINI_API_KEY_GITHUB || null;
}

/**
 * Get Groq API key for authenticated user
 * Priority: Database (user's key) > Environment variable (GROQ_API_KEY)
 */
export async function getGroqApiKeyServer(): Promise<string | null> {
  try {
    // Try to get from database first
    const { userId } = await auth();
    if (userId) {
      const user = await prisma.user.findFirst({
        where: { clerkId: userId },
        select: { groqApiKey: true },
      });

      if (user?.groqApiKey) {
        return user.groqApiKey;
      }
    }
  } catch (error) {
    console.error("Error fetching Groq API key from DB:", error);
  }

  // Fallback to environment variable
  return process.env.GROQ_API_KEY || null;
}

