"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { GetUserByUserId } from "../actions/user";

interface ChallengeLeaderboardProps {
  challengeId: string;
  challengeStatus?: string;
}

interface LeaderboardEntry {
  rank: number | null;
  userId: string;
  userName: string;
  name: string;
  avatar: string | null;
  points: number;
  progress: any;
  status: string;
  completedAt: string | null;
  joinedAt: string;
}

const ChallengeLeaderboard: React.FC<ChallengeLeaderboardProps> = ({
  challengeId,
  challengeStatus,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userData = await GetUserByUserId(user.id);
        if (userData) {
          setCurrentUserId(userData.id);
        }
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/challenges/${challengeId}/leaderboard`);
        const data = await res.json();
        if (data.success) {
          setLeaderboard(data.data);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    
    // Only set up auto-refresh if challenge is not completed or cancelled
    if (challengeStatus !== "COMPLETED" && challengeStatus !== "CANCELLED") {
      const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [challengeId, challengeStatus]);

  if (loading) return <div className="text-white">Loading leaderboard...</div>;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-600" />;
    return <span className="text-gray-400 font-bold">#{rank}</span>;
  };

  // Find current user's entry
  const currentUserEntry = currentUserId
    ? leaderboard.find((entry) => entry.userId === currentUserId)
    : null;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
        {currentUserEntry && currentUserEntry.rank && currentUserEntry.status !== "FAILED" && (
          <div className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
            Your Rank: {getRankIcon(currentUserEntry.rank)}
            <span className="ml-2">#{currentUserEntry.rank}</span>
          </div>
        )}
        {currentUserEntry && currentUserEntry.status === "FAILED" && (
          <div className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold">
            Status: Failed (No Rank)
          </div>
        )}
      </div>
      {leaderboard.length === 0 ? (
        <div className="text-gray-400 text-center py-8">No participants yet</div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => {
            const isCurrentUser = currentUserId === entry.userId;
            return (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                isCurrentUser
                  ? "bg-blue-900 border-2 border-blue-500"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <div className="flex items-center gap-2 min-w-[60px]">
                {entry.rank ? getRankIcon(entry.rank) : <span className="text-gray-500">-</span>}
              </div>
              <div className="flex items-center gap-3 flex-1">
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt={entry.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-white font-semibold">{entry.name}</div>
                  <div className="text-gray-400 text-sm">@{entry.userName}</div>
                </div>
                <div className="text-right min-w-[120px]">
                  <div className="text-white font-bold text-lg mb-1">{entry.points} pts</div>
                  <div
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      entry.status === "COMPLETED"
                        ? "bg-green-600 text-white"
                        : entry.status === "IN_PROGRESS"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-600 text-white"
                    }`}
                  >
                    {entry.status.replace("_", " ")}
                  </div>
                  {entry.completedAt && (
                    <div className="text-gray-400 text-xs mt-1">
                      {new Date(entry.completedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
};

export default ChallengeLeaderboard;


