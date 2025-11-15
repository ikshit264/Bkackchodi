"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { GetUserByUserId } from "../actions/user";
import { BarChart3, TrendingUp, Target, AlertCircle } from "lucide-react";

interface PerformanceDashboardProps {
  userId: string;
}

export default function PerformanceDashboard({ userId }: PerformanceDashboardProps) {
  const { user } = useUser();
  const [performance, setPerformance] = useState<any>(null);
  const [strengthsWeaknesses, setStrengthsWeaknesses] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch performance data
        const perfRes = await fetch(`/api/performance/${userId}`);
        if (perfRes.ok) {
          const perfData = await perfRes.json();
          setPerformance(perfData.data);
        }

        // Fetch strengths/weaknesses
        const swRes = await fetch(`/api/performance/${userId}/strengths-weaknesses`);
        if (swRes.ok) {
          const swData = await swRes.json();
          setStrengthsWeaknesses(swData.data);
        }
      } catch (error) {
        console.error("Error fetching performance:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!performance || !performance.score) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No performance data available yet.</p>
      </div>
    );
  }

  const score = performance.score;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Final Score</span>
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="text-3xl font-bold">{score.finalScore?.toLocaleString() || 0}</div>
          <div className="text-sm opacity-75 mt-1">
            Rank: #{score.rank || "—"}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">GitHub Score</span>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-3xl font-bold">{score.githubScore?.toLocaleString() || 0}</div>
          <div className="text-sm opacity-75 mt-1">
            {score.commits || 0} commits
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Current Streak</span>
            <Target className="w-5 h-5" />
          </div>
          <div className="text-3xl font-bold">{score.currentStreak || 0}</div>
          <div className="text-sm opacity-75 mt-1">
            Longest: {score.longestStreak || 0} days
          </div>
        </div>
      </div>

      {/* GitHub Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">GitHub Activity</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Commits</div>
            <div className="text-2xl font-bold">{score.commits || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pull Requests</div>
            <div className="text-2xl font-bold">{score.pullRequests || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Reviews</div>
            <div className="text-2xl font-bold">{score.review || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Issues</div>
            <div className="text-2xl font-bold">{score.issue || 0}</div>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      {strengthsWeaknesses && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strengthsWeaknesses.strengths && strengthsWeaknesses.strengths.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {strengthsWeaknesses.strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {strengthsWeaknesses.weaknesses && strengthsWeaknesses.weaknesses.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {strengthsWeaknesses.weaknesses.map((weakness: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-red-600">!</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
              {strengthsWeaknesses.recommendations && (
                <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-semibold mb-2">Recommendations:</h4>
                  <ul className="space-y-1">
                    {strengthsWeaknesses.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-xs text-gray-600 dark:text-gray-400">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


