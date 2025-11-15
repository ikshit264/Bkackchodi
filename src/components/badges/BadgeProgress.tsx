"use client";

import { motion } from "framer-motion";

interface BadgeProgressProps {
  progress: number;
  maxProgress: number;
  badgeName: string;
  rarity: string;
}

const rarityColors = {
  COMMON: "from-gray-400 to-gray-600",
  RARE: "from-blue-400 to-blue-600",
  EPIC: "from-purple-400 to-purple-600",
  LEGENDARY: "from-yellow-400 to-yellow-600",
};

export default function BadgeProgress({
  progress,
  maxProgress,
  badgeName,
  rarity,
}: BadgeProgressProps) {
  const percentage = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {badgeName}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {progress} / {maxProgress}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full bg-gradient-to-r ${
            rarityColors[rarity as keyof typeof rarityColors] ||
            rarityColors.COMMON
          }`}
        />
      </div>
    </div>
  );
}


