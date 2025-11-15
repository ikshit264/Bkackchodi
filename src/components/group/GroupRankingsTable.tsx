"use client";

import React, { useEffect, useState } from "react";
import { Trophy, TrendingUp, Users } from "lucide-react";
import { getUserGroups } from "../actions/group";
import type { UserGroupWithScore } from "../../types/groups";
import Loading from "../../app/(root)/loading";

interface GroupRankingsTableProps {
  userId: string;
}

const GroupRankingsTable: React.FC<GroupRankingsTableProps> = ({ userId }) => {
  const [userGroups, setUserGroups] = useState<UserGroupWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const groups = await getUserGroups(userId);
        // Only show groups where user is actively a member
        const activeGroups = groups.filter(
          (g) => g.membership && !g.membership.leftAt
        );
        setUserGroups(activeGroups);
        setError(null);
      } catch (err) {
        console.error("Error fetching user groups:", err);
        setError("Failed to load group rankings");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchGroups();
    }
  }, [userId]);

  const getRankBadge = (rank: number | null | undefined) => {
    if (!rank) return null;
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankStyle = (rank: number | null | undefined) => {
    if (!rank) return "text-neutral-600 dark:text-neutral-400";
    if (rank === 1) return "text-yellow-500 font-bold";
    if (rank === 2) return "text-gray-400 font-semibold";
    if (rank === 3) return "text-amber-600 font-semibold";
    return "text-primary-500";
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
        {error}
      </div>
    );
  }

  if (userGroups.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>You&apos;re not a member of any groups yet.</p>
        <p className="text-sm mt-2">Join groups from the Groups tab to see your rankings here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
        <thead className="bg-neutral-50 dark:bg-neutral-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Group
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Stats
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
          {userGroups.map((group) => {
            const score = group.groupScore;
            return (
              <tr
                key={group.id}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {group.name}
                      </div>
                      {group.description && (
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                          {group.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {score?.finalScore.toLocaleString() || 0}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {score?.rank ? (
                    <div className="flex items-center space-x-2">
                      <Trophy className={`w-5 h-5 ${getRankStyle(score.rank)}`} />
                      <span className={`text-sm font-bold ${getRankStyle(score.rank)}`}>
                        {getRankBadge(score.rank)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      Not ranked
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {score ? (
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                      <div>Courses: {score.coursesStarted || 0}</div>
                      <div>Projects: {score.projectsStarted || 0}</div>
                      <div>Completed: {score.projectsCompleted || 0}</div>
                    </div>
                  ) : (
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      No score data
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default GroupRankingsTable;

