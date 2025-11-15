"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Loading from "../../(root)/loading";
import ChallengeProgress from "../../../components/challenges/ChallengeProgress";
import ChallengeLeaderboard from "../../../components/challenges/ChallengeLeaderboard";
import ChallengeAnalytics from "../../../components/challenges/ChallengeAnalytics";
import { useUser } from "@clerk/nextjs";
import { GetUserByUserId } from "../../../components/actions/user";
import { Book, FileText, Users as UsersIcon } from "lucide-react";

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  criteria: unknown;
  rewards: unknown;
  course?: { id: string; title: string } | null;
  project?: { id: string; title: string } | null;
  sector?: { id: string; name: string; icon?: string } | null;
  group?: { id: string; name: string } | null;
  creator?: {
    id: string;
    userName: string;
    name: string;
    lastName: string;
    avatar: string | null;
  };
  isPublic?: boolean;
  participants: Array<{
    id: string;
    status: string;
    progress: unknown;
    user: {
      id: string;
      userName: string;
      name: string;
      lastName: string;
      avatar: string | null;
    };
  }>;
  _count: { participants: number };
}

const ChallengeDetailPage = () => {
  const params = useParams();
  const challengeId = params.challengeId as string;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  interface AppUser {
    id: string;
    userName: string;
    name: string;
    lastName: string;
    avatar: string | null;
  }
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [joined, setJoined] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/challenges/${challengeId}`);
        const data = await res.json();
        if (data.success) {
          let challengeData = data.data;
          setChallenge(challengeData);

          // Check if end date has passed and challenge is not completed
          if (
            challengeData.endDate &&
            challengeData.status !== "COMPLETED" &&
            challengeData.status !== "CANCELLED"
          ) {
            const endDate = new Date(challengeData.endDate);
            const now = new Date();
            
            if (now >= endDate) {
              // End date has passed, auto-complete the challenge
              try {
                await fetch(`/api/challenges/auto-process`, { method: "POST" });
                // Refetch challenge data after auto-completion
                const res2 = await fetch(`/api/challenges/${challengeId}`);
                const data2 = await res2.json();
                if (data2.success) {
                  challengeData = data2.data; // Use updated challenge data
                  setChallenge(challengeData);
                }
              } catch (error) {
                console.error("Error auto-completing challenge:", error);
              }
            }
          }

          // Check if user is creator and set joined status
          if (user) {
            const fetched = await GetUserByUserId(user.id) as AppUser;
            setUserData(fetched);
            if (fetched) {
              const progressRes = await fetch(
                `/api/challenges/${challengeId}/progress/${fetched.id}`
              );
              if (progressRes.ok) {
                setJoined(true);
              }
              // Check if user is creator using the current challenge data
              if (challengeData?.creator?.id === fetched.id) {
                setIsCreator(true);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching challenge:", error);
      } finally {
        setLoading(false);
      }
    };

    if (challengeId) {
      fetchData();
    }
  }, [challengeId, user]);

  const handleJoin = async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setJoined(true);
        // Refresh challenge data
        const res2 = await fetch(`/api/challenges/${challengeId}`);
        const data2 = await res2.json();
        if (data2.success) {
          setChallenge(data2.data);
        }
      } else {
        alert(data.error || "Failed to join challenge");
      }
    } catch (error) {
      console.error("Error joining challenge:", error);
      alert("Failed to join challenge");
    }
  };

  const handleActivate = async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/activate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert("Challenge activated successfully!");
        // Refresh challenge data
        const res2 = await fetch(`/api/challenges/${challengeId}`);
        const data2 = await res2.json();
        if (data2.success) {
          setChallenge(data2.data);
        }
      } else {
        alert(data.error || "Failed to activate challenge");
      }
    } catch (error) {
      console.error("Error activating challenge:", error);
      alert("Failed to activate challenge");
    }
  };

  if (loading) return <Loading />;
  if (!challenge) return <div className="text-white p-8">Challenge not found</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">{challenge.name}</h1>
          <p className="text-gray-400 mb-4">{challenge.description}</p>

          <div className="flex flex-wrap gap-4 mb-4">
            <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold">
              {challenge.type.replace("_", " ")}
            </span>
            <span className={`px-3 py-1 text-white rounded text-sm font-semibold ${
              challenge.status === "ACTIVE" ? "bg-green-600" :
              challenge.status === "COMPLETED" ? "bg-blue-600" :
              challenge.status === "DRAFT" ? "bg-gray-600" :
              "bg-red-600"
            }`}>
              {challenge.status}
            </span>
            <span className="px-3 py-1 bg-purple-600 text-white rounded text-sm font-semibold">
              {challenge._count.participants} participants
            </span>
            {challenge.isPublic && (
              <span className="px-3 py-1 bg-yellow-600 text-white rounded text-sm font-semibold">
                PUBLIC
              </span>
            )}
          </div>

          {/* Course/Project Info */}
          {(challenge.course || challenge.project) && (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Attached Content:</h3>
              {challenge.course && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Book className="w-4 h-4" />
                  <span>Course: {challenge.course.title}</span>
                </div>
              )}
              {challenge.project && (
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText className="w-4 h-4" />
                  <span>Project: {challenge.project.title}</span>
                </div>
              )}
            </div>
          )}

          {/* Group/Sector Info */}
          {(challenge.group || challenge.sector) && (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Target:</h3>
              {challenge.group && (
                <div className="flex items-center gap-2 text-gray-300">
                  <UsersIcon className="w-4 h-4" />
                  <span>Group: {challenge.group.name}</span>
                </div>
              )}
              {challenge.sector && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-lg">{challenge.sector.icon || "📁"}</span>
                  <span>Sector: {challenge.sector.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {userData && !joined && (challenge.status === "ACTIVE" || challenge.status === "DRAFT") && (
              <button
                onClick={handleJoin}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {challenge.status === "DRAFT" ? "Join Challenge (Queued)" : "Join Challenge"}
              </button>
            )}
            {isCreator && challenge.status === "DRAFT" && (
              <button
                onClick={handleActivate}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Activate Challenge
              </button>
            )}
          </div>
        </div>

        {joined && userData && (
          <ChallengeProgress challengeId={challengeId} userId={userData.id} challengeStatus={challenge.status} />
        )}

        <ChallengeAnalytics challengeId={challengeId} challengeStatus={challenge.status} />

        <ChallengeLeaderboard challengeId={challengeId} challengeStatus={challenge.status} />
      </div>
    </div>
  );
};

export default ChallengeDetailPage;


