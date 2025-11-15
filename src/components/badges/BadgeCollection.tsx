"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BadgeCard from "./BadgeCard";
import { Trophy, Filter, RefreshCw } from "lucide-react";

interface UserBadge {
  id: string;
  badgeId: string;
  earnedAt: Date;
  progress: number;
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string | null;
    category: string;
    rarity: string;
  };
}

interface BadgeCollectionProps {
  userId: string;
}

export default function BadgeCollection({ userId }: BadgeCollectionProps) {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [availableBadges, setAvailableBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showEarned, setShowEarned] = useState(true);
  const [showAvailable, setShowAvailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      
      // Fetch user's badges
      const badgesRes = await fetch(`/api/badges/user/${userId}`);
      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        setUserBadges(badgesData.data || []);
      }

      // Fetch available badges
      const availableRes = await fetch("/api/badges/available");
      if (availableRes.ok) {
        const availableData = await availableRes.json();
        setAvailableBadges(availableData.data || []);
      }
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshMessage(null);
      
      const response = await fetch("/api/badges/refresh", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        const awardedCount = data.data?.awardedBadges?.length || 0;
        const badgeNames = data.data?.awardedBadgeNames || [];
        
        let message = data.message || `Calculated badges! ${awardedCount} new badge(s) awarded.`;
        if (badgeNames.length > 0) {
          message += ` Badges: ${badgeNames.join(", ")}`;
        }
        
        setRefreshMessage(message);
        
        // Refresh badge list
        await fetchBadges();
        
        // Clear message after 8 seconds (longer to read badge names)
        setTimeout(() => setRefreshMessage(null), 8000);
      } else {
        const errorData = await response.json();
        setRefreshMessage(errorData.error || "Failed to refresh badges");
        setTimeout(() => setRefreshMessage(null), 5000);
      }
    } catch (error) {
      console.error("Error refreshing badges:", error);
      setRefreshMessage("Failed to refresh badges");
      setTimeout(() => setRefreshMessage(null), 5000);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredEarnedBadges = userBadges.filter((ub) => {
    if (filter === "all") return true;
    return ub.badge.category === filter;
  });

  const filteredAvailableBadges = availableBadges.filter((badge) => {
    if (filter === "all") return true;
    return badge.category === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refresh Message */}
      {refreshMessage && (
        <div className={`p-4 rounded-lg ${
          refreshMessage.includes("Failed") 
            ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
        }`}>
          {refreshMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary-500" />
          <h2 className="text-2xl font-bold">Badges</h2>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            ({userBadges.length} earned)
          </span>
        </div>

        {/* Filters and Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Calculating..." : "Refresh Badges"}
          </button>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="PROJECTS">Projects</option>
              <option value="STREAKS">Streaks</option>
              <option value="GITHUB">GitHub</option>
              <option value="GROUP">Group</option>
              <option value="COURSE">Course</option>
              <option value="MILESTONE">Milestone</option>
            </select>
          </div>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowEarned(true);
            setShowAvailable(false);
          }}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showEarned
              ? "bg-primary-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          Earned ({userBadges.length})
        </button>
        <button
          onClick={() => {
            setShowEarned(false);
            setShowAvailable(true);
          }}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showAvailable
              ? "bg-primary-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          Available ({availableBadges.length})
        </button>
      </div>

      {/* Earned Badges */}
      {showEarned && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Earned Badges</h3>
          {filteredEarnedBadges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No badges earned yet. Keep learning to earn badges!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredEarnedBadges.map((userBadge) => (
                <BadgeCard
                  key={userBadge.id}
                  badge={{
                    ...userBadge.badge,
                    earnedAt: userBadge.earnedAt,
                  }}
                  earned={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Available Badges */}
      {showAvailable && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Badges</h3>
          {filteredAvailableBadges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No available badges to display.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAvailableBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  earned={false}
                  showProgress={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

