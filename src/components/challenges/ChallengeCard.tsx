"use client";

import React from "react";
import Link from "next/link";
import { Clock, Users, Trophy, Calendar } from "lucide-react";

interface ChallengeCardProps {
  challenge: {
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
  };
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "TIME_LIMITED":
        return "bg-red-500";
      case "SKILL_BASED":
        return "bg-blue-500";
      case "GROUP":
        return "bg-purple-500";
      case "SECTOR_SPECIFIC":
        return "bg-green-500";
      case "STREAK":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500";
      case "DRAFT":
        return "bg-gray-500";
      case "COMPLETED":
        return "bg-blue-500";
      case "CANCELLED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const daysRemaining = challenge.endDate
    ? Math.ceil(
        (new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <Link href={`/challenges/${challenge.id}`}>
      <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700 hover:border-blue-500 transition-all cursor-pointer transform hover:-translate-y-1 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-1 rounded text-xs font-bold text-white ${getTypeColor(
                  challenge.type
                )}`}
              >
                {challenge.type.replace("_", " ")}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-bold text-white ${getStatusColor(
                  challenge.status
                )}`}
              >
                {challenge.status}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{challenge.name}</h3>
            <p className="text-gray-400 text-sm line-clamp-2">{challenge.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-300">
          {challenge.sector && (
            <div className="flex items-center gap-1">
              <span className="text-lg">{challenge.sector.icon || "📁"}</span>
              <span>{challenge.sector.name}</span>
            </div>
          )}
          {challenge.group && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{challenge.group.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{challenge._count.participants} participants</span>
          </div>
          {challenge.endDate && daysRemaining !== null && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                {daysRemaining > 0 ? `${daysRemaining} days left` : "Ended"}
              </span>
            </div>
          )}
        </div>

        {challenge.startDate && challenge.endDate && (
          <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ChallengeCard;












