"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  name: string;
  avatar: string | null;
  email: string | null;
  finalScore: number;
  githubScore: number;
  commits: number;
  pullRequests: number;
  review: number;
  issue: number;
  contribution: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  isMe?: boolean;
}

export default function LeaderboardPage() {
  const { user } = useUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myScore, setMyScore] = useState<any>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/leaderboard?limit=100", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Failed to load leaderboard");
          return;
        }

        if (json.data) {
          setLeaderboard(json.data);
        }

        if (json.myRank) {
          setMyRank(json.myRank);
        }

        if (json.myScore) {
          setMyScore(json.myScore);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Global Leaderboard</h1>
        {myRank && myScore && (
          <div className="text-right">
            <div className="text-sm text-gray-600">Your Rank</div>
            <div className="text-2xl font-bold">#{myRank}</div>
            <div className="text-sm text-gray-600">Score: {myScore.finalScore.toLocaleString()}</div>
          </div>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No scores yet. Start contributing to see rankings!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left p-3 font-semibold">Rank</th>
                <th className="text-left p-3 font-semibold">User</th>
                <th className="text-right p-3 font-semibold">Final Score</th>
                <th className="text-right p-3 font-semibold">GitHub Score</th>
                <th className="text-right p-3 font-semibold">Commits</th>
                <th className="text-right p-3 font-semibold">PRs</th>
                <th className="text-right p-3 font-semibold">Reviews</th>
                <th className="text-right p-3 font-semibold">Issues</th>
                <th className="text-right p-3 font-semibold">Streak</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr
                  key={entry.userId}
                  className={`border-b border-gray-200 hover:bg-gray-50 ${
                    entry.isMe ? "bg-blue-50 font-semibold" : ""
                  }`}
                >
                  <td className="p-3">
                    <span className="font-bold">#{entry.rank}</span>
                    {entry.isMe && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt={entry.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm">
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{entry.userName || entry.name}</div>
                        {entry.name && entry.name !== entry.userName && (
                          <div className="text-xs text-gray-500">{entry.name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right font-semibold">{entry.finalScore.toLocaleString()}</td>
                  <td className="p-3 text-right">{entry.githubScore.toLocaleString()}</td>
                  <td className="p-3 text-right">{entry.commits.toLocaleString()}</td>
                  <td className="p-3 text-right">{entry.pullRequests.toLocaleString()}</td>
                  <td className="p-3 text-right">{entry.review.toLocaleString()}</td>
                  <td className="p-3 text-right">{entry.issue.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {entry.currentStreak} / {entry.longestStreak}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

