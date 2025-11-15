"use client";

import { motion } from "framer-motion";
import { Badge as BadgeType, BadgeRarity } from "@prisma/client";

interface BadgeCardProps {
  badge: BadgeType & {
    earnedAt?: Date;
    progress?: number;
    maxProgress?: number;
  };
  earned?: boolean;
  showProgress?: boolean;
  onClick?: () => void;
}

const rarityColors = {
  COMMON: "from-gray-400 to-gray-600",
  RARE: "from-blue-400 to-blue-600",
  EPIC: "from-purple-400 to-purple-600",
  LEGENDARY: "from-yellow-400 to-yellow-600",
};

const rarityBorders = {
  COMMON: "border-gray-400",
  RARE: "border-blue-400",
  EPIC: "border-purple-400",
  LEGENDARY: "border-yellow-400",
};

export default function BadgeCard({
  badge,
  earned = false,
  showProgress = false,
  onClick,
}: BadgeCardProps) {
  const progress = badge.progress || 0;
  const maxProgress = badge.maxProgress || 1;
  const progressPercentage = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all ${
        earned
          ? `${rarityBorders[badge.rarity]} bg-gradient-to-br ${rarityColors[badge.rarity]} shadow-lg`
          : "border-gray-300 bg-gray-100 dark:bg-gray-800 opacity-60"
      }`}
    >
      {/* Badge Icon/Image */}
      <div className="text-center mb-2 relative">
        {badge.image ? (
          <>
            <img
              src={badge.image}
              alt={badge.name}
              className="w-16 h-16 mx-auto mb-2 object-contain"
              onError={(e) => {
                // Fallback to icon if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.parentElement?.querySelector(".badge-fallback-icon") as HTMLElement;
                if (fallback) {
                  fallback.style.display = "block";
                }
              }}
            />
            <div className="badge-fallback-icon text-4xl mb-2" style={{ display: "none" }}>
              {badge.icon || "🏆"}
            </div>
          </>
        ) : (
          <div className="text-4xl mb-2">
            {badge.icon || "🏆"}
          </div>
        )}
        {earned && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2"
          >
            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
              ✓
            </span>
          </motion.div>
        )}
      </div>

      {/* Badge Name */}
      <h3
        className={`text-sm font-bold text-center mb-1 ${
          earned ? "text-white" : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {badge.name}
      </h3>

      {/* Badge Description */}
      <p
        className={`text-xs text-center mb-2 ${
          earned ? "text-white/80" : "text-gray-600 dark:text-gray-400"
        }`}
      >
        {badge.description}
      </p>

      {/* Progress Bar */}
      {showProgress && !earned && maxProgress > 1 && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              className={`h-2 rounded-full bg-gradient-to-r ${rarityColors[badge.rarity]}`}
            />
          </div>
          <p className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400">
            {progress} / {maxProgress}
          </p>
        </div>
      )}

      {/* Rarity Badge */}
      <div className="absolute top-1 left-1">
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            earned
              ? "bg-white/20 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          }`}
        >
          {badge.rarity}
        </span>
      </div>

      {/* Earned Date */}
      {earned && badge.earnedAt && (
        <div className="text-xs text-center mt-2 text-white/80">
          Earned {new Date(badge.earnedAt).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  );
}

