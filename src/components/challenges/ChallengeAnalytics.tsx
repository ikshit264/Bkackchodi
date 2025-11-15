"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Medal, Award, TrendingUp, Users, Target } from "lucide-react";

interface Participant {
  userId: string;
  userName: string;
  name: string;
  avatar: string | null;
  rank: number | null;
  points: number;
  status: string;
  courseProgress: number;
  completedProjects: number;
  totalProjects: number;
  joinedAt: string;
  completedAt: string | null;
}

interface ChallengeAnalyticsProps {
  challengeId: string;
  challengeStatus?: string;
}

const ChallengeAnalytics: React.FC<ChallengeAnalyticsProps> = ({ challengeId, challengeStatus }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/challenges/${challengeId}/analytics`);
        const data = await res.json();
        if (data.success) {
          setAnalytics(data.data);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    
    // Only set up auto-refresh if challenge is not completed or cancelled
    if (challengeStatus !== "COMPLETED" && challengeStatus !== "CANCELLED") {
      const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [challengeId, challengeStatus]);

  if (loading) return <div className="text-white">Loading analytics...</div>;
  if (!analytics) return null;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-600" />;
    return <span className="text-gray-400 font-bold text-lg">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border-4 border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400 text-sm">Total Participants</span>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.analytics.totalParticipants}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border-4 border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Completed</span>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.analytics.completedCount}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border-4 border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 text-sm">In Progress</span>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.analytics.inProgressCount}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border-4 border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Average Points</span>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.analytics.averagePoints}</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4">Leaderboard</h2>
        <div className="space-y-2">
          {analytics.participants.map((participant: Participant) => (
            <div
              key={participant.userId}
              className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-[80px]">
                {participant.rank ? getRankIcon(participant.rank) : <span className="text-gray-500">-</span>}
              </div>
              
              <div className="flex items-center gap-3 flex-1">
                {participant.avatar ? (
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-white font-semibold">{participant.name}</div>
                  <div className="text-gray-400 text-sm">@{participant.userName}</div>
                </div>
              </div>

              <div className="text-right min-w-[100px]">
                <div className="text-white font-bold text-lg">{participant.points} pts</div>
                {participant.totalProjects > 0 && (
                  <div className="text-gray-400 text-sm">
                    {participant.completedProjects}/{participant.totalProjects} projects
                  </div>
                )}
                {participant.courseProgress > 0 && (
                  <div className="text-gray-400 text-sm">{participant.courseProgress}% complete</div>
                )}
              </div>

              <div className="text-right min-w-[120px]">
                <div
                  className={`px-3 py-1 rounded text-sm font-semibold ${
                    participant.status === "COMPLETED"
                      ? "bg-green-600 text-white"
                      : participant.status === "IN_PROGRESS"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-600 text-white"
                  }`}
                >
                  {participant.status.replace("_", " ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChallengeAnalytics;

