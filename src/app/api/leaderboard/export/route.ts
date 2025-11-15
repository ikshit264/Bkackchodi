/**
 * GET /api/leaderboard/export
 * Export leaderboard to CSV/PDF
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv"; // csv or pdf
    const limit = parseInt(searchParams.get("limit") || "1000");

    // Get leaderboard data
    const scores = await prisma.score.findMany({
      take: limit,
      orderBy: [
        { finalScore: "desc" },
        { lastUpdatedDate: "desc" },
      ],
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            name: true,
            lastName: true,
            email: true,
            country: true,
            city: true,
          },
        },
      },
    });

    if (format === "csv") {
      // Generate CSV
      const headers = ["Rank", "Username", "Name", "Email", "Country", "City", "Final Score", "GitHub Score", "Commits", "PRs", "Streak"];
      const rows = scores.map((score, index) => [
        index + 1,
        score.user.userName || "",
        `${score.user.name} ${score.user.lastName}`.trim(),
        score.user.email || "",
        score.user.country || "",
        score.user.city || "",
        score.finalScore.toFixed(2),
        score.githubScore,
        score.commits,
        score.pullRequests,
        score.currentStreak,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="leaderboard-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else if (format === "pdf") {
      // For PDF, return JSON data (client-side can use a library like jsPDF)
      return NextResponse.json({
        success: true,
        data: scores.map((score, index) => ({
          rank: index + 1,
          userName: score.user.userName,
          name: `${score.user.name} ${score.user.lastName}`.trim(),
          email: score.user.email,
          country: score.user.country,
          city: score.user.city,
          finalScore: score.finalScore,
          githubScore: score.githubScore,
          commits: score.commits,
          pullRequests: score.pullRequests,
          streak: score.currentStreak,
        })),
        message: "PDF generation should be done client-side. Data provided in JSON format.",
      });
    }

    return NextResponse.json(
      { error: "Invalid format. Use 'csv' or 'pdf'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error exporting leaderboard:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}












