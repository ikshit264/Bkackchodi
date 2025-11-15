"use client";

import { motion } from "framer-motion";
import { Users, TrendingUp } from "lucide-react";

interface Sector {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  type?: string; // CUSTOM or CATEGORY
  _count?: {
    members?: number;
    userSectors?: number;
    courses: number;
  };
}

interface SectorCardProps {
  sector: Sector;
  isJoined?: boolean;
  userRank?: number;
  userScore?: number;
  onJoin?: () => void;
  onClick?: () => void;
}

export default function SectorCard({
  sector,
  isJoined = false,
  userRank,
  userScore,
  onJoin,
  onClick,
}: SectorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`rounded-xl p-6 border-2 transition-all cursor-pointer ${
        isJoined
          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
          : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{sector.icon || "📁"}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {sector.name}
            </h3>
            {sector.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {sector.description}
              </p>
            )}
          </div>
        </div>
        {isJoined && (
          <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded-full">
            Joined
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
              {sector._count && (
                <>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{sector._count.members || sector._count.userSectors || 0} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{sector._count.courses} courses</span>
                  </div>
                </>
              )}
        </div>
      </div>

      {isJoined && (userRank !== undefined || userScore !== undefined) && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {userRank !== undefined && (
              <div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Your Rank</span>
                <p className="text-lg font-bold text-primary-500">#{userRank}</p>
              </div>
            )}
            {userScore !== undefined && (
              <div className="text-right">
                <span className="text-xs text-gray-600 dark:text-gray-400">Your Score</span>
                <p className="text-lg font-bold text-primary-500">{userScore}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isJoined && onJoin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin();
          }}
          className="mt-4 w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Join Sector
        </button>
      )}
    </motion.div>
  );
}

