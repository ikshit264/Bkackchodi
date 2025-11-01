import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../lib/prisma";
import axios from "axios";

const prisma = getPrismaClient();

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findFirst({
      where: { clerkId: userId },
      select: { githubToken: true },
    });

    if (!user || !user.githubToken) {
      return NextResponse.json(
        { error: "GitHub token not found" },
        { status: 404 }
      );
    }

    // Fetch all repos from GitHub
    const headers = {
      Authorization: `Bearer ${user.githubToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const repos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        `https://api.github.com/user/repos?type=owner&per_page=100&page=${page}`,
        { headers }
      );

    const pageRepos = response.data.map((repo: { name: string; full_name: string; private: boolean }) => ({
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
    }));

      repos.push(...pageRepos);

      if (pageRepos.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return NextResponse.json({ repos });
  } catch (err) {
    console.error("Error fetching repos:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch repositories";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
