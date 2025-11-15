"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, Trophy, TrendingUp, CheckCircle, BookOpen, Lock, Globe, Tag } from "lucide-react";
import type { Group } from "../../types/groups";
import Link from "next/link";

interface GroupCardProps {
  group: Group;
  isJoined: boolean;
  userRank?: number | null;
  userScore?: number;
  memberCount?: number;
  onJoin?: () => void;
  onLeave?: () => void;
  loading?: boolean;
  userName?: string;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  isJoined,
  userRank,
  userScore,
  memberCount,
  onJoin,
  onLeave,
  loading = false,
  userName,
}) => {
  const getRankBadge = (rank: number | null | undefined) => {
    if (!rank) return null;
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const rankColor = (rank: number | null | undefined) => {
    if (!rank) return "text-neutral-600 dark:text-neutral-400";
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "text-primary-500";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -8,
        scale: 1.02,
        transition: { duration: 0.3 },
      }}
      viewport={{ once: true }}
      className="group relative w-full max-w-sm mx-auto"
    >
      <div
        className={`relative p-6 card-glass hover:shadow-glow transition-all duration-500 border ${
          isJoined
            ? "border-primary-500/20"
            : "border-neutral-300/20 dark:border-neutral-700/20"
        }`}
      >
        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center shadow-medium group-hover:shadow-glow transition-all duration-300"
            >
              <Users className="w-6 h-6 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-gradient transition-all duration-300 line-clamp-1">
                  {group.name}
                </h3>
                {group.type === "CATEGORY" && (
                  <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    CATEGORY
                  </span>
                )}
                {group.type === "CUSTOM" && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    CUSTOM
                  </span>
                )}
                {group.isPrivate ? (
                  <Lock className="w-3 h-3 text-gray-500" title="Private Group" />
                ) : (
                  <Globe className="w-3 h-3 text-gray-500" title="Public Group" />
                )}
              </div>
              {group.description && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                  {group.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 space-y-2 mb-4">
          {isJoined && (
            <>
              {userRank !== undefined && userRank !== null && (
                <div className="flex items-center space-x-2 text-sm">
                  <Trophy className={`w-4 h-4 ${rankColor(userRank)}`} />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    <span className="font-semibold">Rank:</span>{" "}
                    <span className={rankColor(userRank)}>
                      {getRankBadge(userRank)}
                    </span>
                  </span>
                </div>
              )}
              {userScore !== undefined && (
                <div className="flex items-center space-x-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    <span className="font-semibold">Score:</span>{" "}
                    <span className="text-primary-500 font-bold">
                      {userScore.toLocaleString()}
                    </span>
                  </span>
                </div>
              )}
            </>
          )}
          {memberCount !== undefined && (
            <div className="flex items-center space-x-2 text-sm">
              <Users className="w-4 h-4 text-neutral-500" />
              <span className="text-neutral-600 dark:text-neutral-400">
                {memberCount} member{memberCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {/* Courses Count */}
          {group.courses && group.courses.length > 0 && (
            <div className="flex items-center space-x-2 text-sm">
              <BookOpen className="w-4 h-4 text-primary-500" />
              <span className="text-neutral-600 dark:text-neutral-400">
                {group.courses.length} course{group.courses.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Courses List */}
        {group.courses && group.courses.length > 0 && (
          <div className="relative z-10 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Recent Courses
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {group.courses.slice(0, 3).map((course) => (
                userName ? (
                  <Link
                    key={course.id}
                    href={`/${userName}/c/${course.id}`}
                    className="block p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-3 h-3 text-primary-500 flex-shrink-0" />
                      <span className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-1">
                        {course.title}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={course.id}
                    className="block p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800"
                  >
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-3 h-3 text-primary-500 flex-shrink-0" />
                      <span className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-1">
                        {course.title}
                      </span>
                    </div>
                  </div>
                )
              ))}
              {group.courses.length > 3 && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center pt-1">
                  +{group.courses.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="relative z-10 mt-4">
          {isJoined ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onLeave}
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-500 hover:bg-primary-500/20 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"
                  />
                  <span>Leaving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Joined</span>
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onJoin}
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:shadow-glow transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Join Group</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GroupCard;

