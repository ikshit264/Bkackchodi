"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  name: string;
  avatar: string | null;
  finalScore: number;
  commits?: number;
  pullRequests?: number;
  review?: number;
  issue?: number;
  contribution?: number;
  coursesStarted?: number;
  averageCourseCompletion?: number;
  projectsStarted?: number;
  projectsCompleted?: number;
  totalAiEvaluationScore?: number;
}

export default function GroupLeaderboard({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);


  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get group info to get myId
        const groupRes = await fetch(`/api/groups/${groupId}`, { cache: "no-store" });
        if (groupRes.ok) {
          const groupJson = await groupRes.json();
          setMyId(groupJson.data?.__meta?.meId || null);
        }

        const res = await fetch(`/api/groups/${groupId}/leaderboard?limit=50`, { cache: "no-store" });
        const json = await res.json();
        
        if (!res.ok) {
          setError(json.error || "Failed to load leaderboard");
          return;
        }

        // API returns { data: { data: [...], cursor, hasMore } }
        if (json.data?.data) {
          setLeaderboard(json.data.data);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [groupId]);

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

  if (leaderboard.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No scores yet. Start working on projects to see rankings!</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left p-3 font-semibold">Rank</th>
              <th className="text-left p-3 font-semibold">User</th>
              <th className="text-right p-3 font-semibold">Score</th>
              <th className="text-right p-3 font-semibold">Courses Started</th>
              <th className="text-right p-3 font-semibold">Avg. Completion</th>
              <th className="text-right p-3 font-semibold">Projects Started</th>
              <th className="text-right p-3 font-semibold">Projects Completed</th>
              <th className="text-right p-3 font-semibold">AI Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => {
              const isMe = myId && entry.userId === myId;
              return (
              <tr
                key={entry.userId}
                className={`border-b border-gray-200 hover:bg-gray-50 ${
                  isMe ? "bg-blue-50 font-semibold" : ""
                }`}
              >
                <td className="p-3">
                  <span className="font-bold">#{entry.rank}</span>
                  {isMe && <span className="ml-2 text-xs text-blue-600">(You)</span>}
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
                <td className="p-3 text-right">{entry.coursesStarted || 0}</td>
                <td className="p-3 text-right">{entry.averageCourseCompletion ? `${entry.averageCourseCompletion.toFixed(1)}%` : "0.0%"}</td>
                <td className="p-3 text-right">{entry.projectsStarted || 0}</td>
                <td className="p-3 text-right">{entry.projectsCompleted || 0}</td>
                <td className="p-3 text-right">
                  {entry.totalAiEvaluationScore
                    ? entry.totalAiEvaluationScore.toFixed(1)
                    : "0.0"}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
