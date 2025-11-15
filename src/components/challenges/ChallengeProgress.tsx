"use client";

import React, { useEffect, useState } from "react";

interface ChallengeProgressProps {
  challengeId: string;
  userId: string;
  challengeStatus?: string;
}

const ChallengeProgress: React.FC<ChallengeProgressProps> = ({
  challengeId,
  userId,
  challengeStatus,
}) => {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/challenges/${challengeId}/progress/${userId}`);
        const data = await res.json();
        if (data.success) {
          setProgress(data.data);
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
    
    // Only set up auto-refresh if challenge is not completed or cancelled
    if (challengeStatus !== "COMPLETED" && challengeStatus !== "CANCELLED") {
      const interval = setInterval(fetchProgress, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [challengeId, userId, challengeStatus]);

  if (loading) return <div className="text-white">Loading progress...</div>;
  if (!progress) return null;

  const challengeCriteria = progress.challenge.criteria || {};
  const userProgress = progress.progress || {};
  const status = progress.status;
  const points = progress.points || 0;
  const rank = progress.rank || null;

  const calculatePercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Your Progress</h2>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Points</div>
          <div className="text-3xl font-bold text-blue-400">{points}</div>
          {rank && status !== "FAILED" && (
            <>
              <div className="text-gray-400 text-sm mt-1">Rank</div>
              <div className="text-2xl font-bold text-yellow-400">#{rank}</div>
            </>
          )}
          {status === "FAILED" && (
            <>
              <div className="text-gray-400 text-sm mt-1">Status</div>
              <div className="text-lg font-bold text-red-400">Failed</div>
            </>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {challengeCriteria.projectsCompleted !== undefined && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Projects Completed</span>
              <span className="text-white font-semibold">
                {userProgress.projectsCompleted || 0} / {challengeCriteria.projectsCompleted}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{
                  width: `${calculatePercentage(
                    userProgress.projectsCompleted || 0,
                    challengeCriteria.projectsCompleted
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {challengeCriteria.coursesCompleted !== undefined && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Courses Completed</span>
              <span className="text-white font-semibold">
                {userProgress.coursesCompleted || 0} / {challengeCriteria.coursesCompleted}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{
                  width: `${calculatePercentage(
                    userProgress.coursesCompleted || 0,
                    challengeCriteria.coursesCompleted
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {challengeCriteria.badgesEarned !== undefined && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Badges Earned</span>
              <span className="text-white font-semibold">
                {userProgress.badgesEarned || 0} / {challengeCriteria.badgesEarned}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-yellow-600 h-3 rounded-full transition-all"
                style={{
                  width: `${calculatePercentage(
                    userProgress.badgesEarned || 0,
                    challengeCriteria.badgesEarned
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {challengeCriteria.streakDays !== undefined && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Streak Days</span>
              <span className="text-white font-semibold">
                {userProgress.streakDays || 0} / {challengeCriteria.streakDays}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-orange-600 h-3 rounded-full transition-all"
                style={{
                  width: `${calculatePercentage(
                    userProgress.streakDays || 0,
                    challengeCriteria.streakDays
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {challengeCriteria.pointsRequired !== undefined && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Points Required</span>
              <span className="text-white font-semibold">
                {points} / {challengeCriteria.pointsRequired}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-purple-600 h-3 rounded-full transition-all"
                style={{
                  width: `${calculatePercentage(
                    points,
                    challengeCriteria.pointsRequired
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-gray-300">Status:</span>
            <span
              className={`px-3 py-1 rounded text-sm font-semibold ${
                status === "COMPLETED"
                  ? "bg-green-600 text-white"
                  : status === "IN_PROGRESS"
                  ? "bg-blue-600 text-white"
                  : status === "FAILED"
                  ? "bg-red-600 text-white"
                  : "bg-gray-600 text-white"
              }`}
            >
              {status.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeProgress;


