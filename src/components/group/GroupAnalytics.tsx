"use client";
import { useEffect, useState } from "react";

interface ComparisonData {
  me: {
    user: { id: string; userName: string; name: string; avatar: string | null };
    finalScore: number;
    coursesStarted: number;
    averageCourseCompletion: number;
    projectsStarted: number;
    projectsCompleted: number;
    totalAiEvaluationScore: number;
    rank: number | null;
  };
  target: {
    user: { id: string; userName: string; name: string; avatar: string | null };
    finalScore: number;
    coursesStarted: number;
    averageCourseCompletion: number;
    projectsStarted: number;
    projectsCompleted: number;
    totalAiEvaluationScore: number;
    rank: number | null;
  };
  differences: {
    finalScore: number;
    coursesStarted: number;
    averageCourseCompletion: number;
    projectsStarted: number;
    projectsCompleted: number;
    totalAiEvaluationScore: number;
    rank: number;
  };
}

export default function GroupAnalytics({ groupId }: { groupId: string }) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [compareToTop, setCompareToTop] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}&limit=10`);
      const json = await res.json();
      setSearchResults(json.data || []);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const fetchComparison = async (userId: string | null, top: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/groups/${groupId}/analytics?${top ? "top=true" : `userId=${userId}`}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to load comparison");
        return;
      }

      setComparison(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to load comparison");
    } finally {
      setLoading(false);
    }
  };

  const handleCompareToTop = () => {
    setCompareToTop(true);
    setSelectedUserId(null);
    fetchComparison(null, true);
  };

  const handleCompareToUser = (userId: string) => {
    setCompareToTop(false);
    setSelectedUserId(userId);
    setSearchQuery("");
    setSearchResults([]);
    fetchComparison(userId, false);
  };

  const formatValue = (value: number, isPercent = false) => {
    if (isPercent) {
      return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
    }
    return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
  };

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return "text-green-600";
    if (diff < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Analytics & Comparison</h2>

      {/* Search and Compare Controls */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex gap-4">
          <button
            onClick={handleCompareToTop}
            className={`px-4 py-2 rounded ${
              compareToTop
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Compare to Top User
          </button>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-2">Or compare with a specific user:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers();
              }}
              placeholder="Search by username or email"
              className="flex-1 border rounded p-2"
            />
          </div>
          {searchResults.length > 0 && (
            <ul className="mt-2 border rounded bg-white max-h-40 overflow-auto">
              {searchResults.map((user) => (
                <li
                  key={user.id}
                  onClick={() => handleCompareToUser(user.id)}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                >
                  {user.avatar && (
                    <img src={user.avatar} alt={user.userName} className="w-6 h-6 rounded-full" />
                  )}
                  <div>
                    <div className="font-medium">{user.userName || user.name}</div>
                    {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading comparison...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {comparison && !loading && (
        <div className="space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-3 mb-4">
                {comparison.me.user.avatar ? (
                  <img
                    src={comparison.me.user.avatar}
                    alt={comparison.me.user.userName}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-300 flex items-center justify-center text-xl font-bold">
                    {comparison.me.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-lg">{comparison.me.user.userName}</div>
                  <div className="text-sm text-gray-600">You</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Rank:</span>
                  <span className="font-semibold">#{comparison.me.rank || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Final Score:</span>
                  <span className="font-semibold">{comparison.me.finalScore.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-3 mb-4">
                {comparison.target.user.avatar ? (
                  <img
                    src={comparison.target.user.avatar}
                    alt={comparison.target.user.userName}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold">
                    {comparison.target.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-lg">{comparison.target.user.userName}</div>
                  <div className="text-sm text-gray-600">
                    {compareToTop ? "Top User" : "Selected User"}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Rank:</span>
                  <span className="font-semibold">#{comparison.target.rank || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Final Score:</span>
                  <span className="font-semibold">
                    {comparison.target.finalScore.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-semibold">Metric</th>
                  <th className="text-right p-3 font-semibold">You</th>
                  <th className="text-right p-3 font-semibold">Target</th>
                  <th className="text-right p-3 font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">Final Score</td>
                  <td className="p-3 text-right">{comparison.me.finalScore.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {comparison.target.finalScore.toLocaleString()}
                  </td>
                  <td className={`p-3 text-right font-semibold ${getDifferenceColor(comparison.differences.finalScore)}`}>
                    {formatValue(comparison.differences.finalScore)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Courses Started</td>
                  <td className="p-3 text-right">{comparison.me.coursesStarted}</td>
                  <td className="p-3 text-right">{comparison.target.coursesStarted}</td>
                  <td className={`p-3 text-right font-semibold ${getDifferenceColor(comparison.differences.coursesStarted)}`}>
                    {formatValue(comparison.differences.coursesStarted)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Avg. Course Completion</td>
                  <td className="p-3 text-right">
                    {comparison.me.averageCourseCompletion.toFixed(1)}%
                  </td>
                  <td className="p-3 text-right">
                    {comparison.target.averageCourseCompletion.toFixed(1)}%
                  </td>
                  <td className={`p-3 text-right font-semibold ${getDifferenceColor(comparison.differences.averageCourseCompletion)}`}>
                    {formatValue(comparison.differences.averageCourseCompletion, true)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Projects Started</td>
                  <td className="p-3 text-right">{comparison.me.projectsStarted}</td>
                  <td className="p-3 text-right">{comparison.target.projectsStarted}</td>
                  <td className={`p-3 text-right font-semibold ${getDifferenceColor(comparison.differences.projectsStarted)}`}>
                    {formatValue(comparison.differences.projectsStarted)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Projects Completed</td>
                  <td className="p-3 text-right">{comparison.me.projectsCompleted}</td>
                  <td className="p-3 text-right">{comparison.target.projectsCompleted}</td>
                  <td className={`p-3 text-right font-semibold ${getDifferenceColor(comparison.differences.projectsCompleted)}`}>
                    {formatValue(comparison.differences.projectsCompleted)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Total AI Evaluation Score</td>
                  <td className="p-3 text-right">
                    {comparison.me.totalAiEvaluationScore.toFixed(1)}
                  </td>
                  <td className="p-3 text-right">
                    {comparison.target.totalAiEvaluationScore.toFixed(1)}
                  </td>
                  <td className={`p-3 text-right font-semibold ${getDifferenceColor(comparison.differences.totalAiEvaluationScore)}`}>
                    {formatValue(comparison.differences.totalAiEvaluationScore)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

