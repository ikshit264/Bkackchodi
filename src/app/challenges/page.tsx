"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChallengeCard from "../../components/challenges/ChallengeCard";
import Loading from "../(root)/loading";

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  sector?: { id: string; name: string; icon?: string } | null;
  group?: { id: string; name: string } | null;
  _count: { participants: number };
}

const ChallengesPage = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "completed">("all");

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        const status = filter === "all" ? null : filter.toUpperCase();
        const url = status
          ? `/api/challenges?status=${status}`
          : "/api/challenges";
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setChallenges(data.data);
        }
      } catch (error) {
        console.error("Error fetching challenges:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [filter]);

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gradient-to-br p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">Challenges</h1>
            <p className="text-gray-400">
              Compete in challenges to earn rewards and climb the leaderboard!
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/challenges/invites"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              My Invites
            </Link>
            <Link
              href="/challenges/requests"
              className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              Requests
            </Link>
            <Link
              href="/challenges/create"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Challenge
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(["all", "active", "draft", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.length === 0 ? (
            <div className="col-span-full text-center text-gray-400 py-12">
              No challenges found. Check back later!
            </div>
          ) : (
            challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengesPage;


