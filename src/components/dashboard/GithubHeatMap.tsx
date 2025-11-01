import React, { useState, useEffect } from "react";
import Loading from "../../app/(root)/loading";
import { fetchGitHubStatsForYear } from "../actions/user/Calculation";
import { GetUserByUserId } from "../actions/user";
import { useUser } from "@clerk/nextjs";

interface DayCell {
  date: string;
  count: number;
}

interface BackendScore {
  matrix: (DayCell | null)[][];
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  finalScore: number;
  pullRequests: number;
  commits: number;
  review: number;
  issue: number;
  contribution: number;
  lastUpdatedDate: string;
  rank: number;
  availableYears?: number[];
}

const GitHubHeatmap = ({ userName }: { userName: string }) => {
  const [data, setData] = useState<BackendScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [refetching, setRefetching] = useState(false);
    const [RankData, setRankData] = useState({
      username: "",
      fromDate: "",
      toDate: "",
      stats: {
        commits: 0,
        issues: 0,
        prs: 0,
        reviews: 0,
        totalContributions: 0,
        stars: 0,
        followers: 0,
      },
      score: 0,
    });
  const { user } = useUser();

  const fetchData = async (forceFetch = false) => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (forceFetch) {
        res = await fetch("/api/query/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userName, forceFetch: true }),
        });
      } else {
        res = await fetch(
          `/api/query/score?userName=${userName}&year=${selectedYear}`
        );
      }
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      if (json.availableYears) setAvailableYears(json.availableYears);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setRefetching(false);
      const fetched = await GetUserByUserId(user.id);
      const ress = await fetchGitHubStatsForYear(
        fetched.githubToken,
        fetched.userName
      );
      console.log("Finished fetching user data.", ress);
      if (ress) {
        setRankData(ress);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [userName, selectedYear]);

  if (loading) return <Loading />;
  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-4 w-full">
          <div className="font-bold mb-2">Error</div>
          <div>{error}</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );

  if (!data || !data.matrix)
    return (
      <div className="text-center text-lg text-white">
        No contribution data found.
      </div>
    );

  // === Heatmap helpers ===
  const getContributionLevel = (count: number) => {
    if (count === 0) return 0;
    if (count < 5) return 1;
    if (count < 10) return 2;
    if (count < 15) return 3;
    return 4;
  };
  const getLevelColor = (level: number) => {
    const colors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
    return colors[level];
  };

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const getMonthLabels = () => {
    if (!data.matrix) return [];
    const labels: { month: string; position: number }[] = [];
    let lastMonth = -1;
    data.matrix.forEach((week: (DayCell | null)[], weekIndex: number) => {
      const firstValidDay = week.find((day) => day && day.date);
      if (firstValidDay) {
        const date = new Date(firstValidDay.date);
        const month = date.getMonth();
        if (month !== lastMonth && date.getDate() <= 7) {
          labels.push({ month: months[month], position: weekIndex });
          lastMonth = month;
        }
      }
    });
    return labels;
  };

  const monthLabels = getMonthLabels();

  const stats = RankData.stats || {
    commits: 0,
    issues: 0,
    prs: 0,
    reviews: 0,
    totalContributions: 0,
    stars: 0,
    followers: 0,
  };

  return (
    <div className=" text-white p-8">
      <div className="w-full">
        <div className="bg-gray-800 p-6 rounded-lg mb-8 flex flex-wrap justify-between items-center gap-4">
          <div>
            <div>DEVELOPER : </div>
            <div className="text-2xl font-bold text-green-400">@{userName}</div>
          </div>

          <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 transform transition-transform hover:-translate-y-1 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative group z-50">
                <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.15)] border-4 border-slate-800 p-6 cursor-pointer transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_0_0_rgba(0,0,0,0.2)]">
                  {typeof data.rank === "number" && (
                    <div className="text-center">
                      <div className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                        Global Rank
                      </div>
                      <div className="text-5xl font-black text-white">
                        {data.rank ? `#${data.rank}` : "N/A"}
                      </div>
                      <button
                        disabled={refetching}
                        onClick={() => {
                          setRefetching(true);
                          fetchData(true);
                        }}
                        className={`px-4 py-2 rounded text-white font-semibold transition-colors bg-gray-50/20`}
                      >
                        {refetching ? "Refetching..." : "Refetch Rank"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 transform transition-transform hover:-translate-y-1 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative group z-50">
                <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.15)] border-4 border-slate-800 p-6 cursor-pointer transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_0_0_rgba(0,0,0,0.2)]">
                  <div className="text-center">
                    <div className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                      Developer Score
                    </div>
                    <div className="text-5xl font-black text-white">
                      {data.rank ? data.finalScore?.toFixed(1) : "N/A"}
                    </div>
                    <div className="text-xs text-emerald-100 mt-1 font-semibold">
                      Hover for details
                    </div>
                  </div>
                </div>

                {/* Hover Stats Tooltip */}
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none group-hover:pointer-events-auto"
                  style={{ zIndex: 9999 }}
                >
                  <div className="bg-white rounded-2xl shadow-[0_12px_24px_0_rgba(0,0,0,0.25)] border-4 border-slate-800 p-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
                        Contribution Stats
                      </h3>
                      <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mt-2 rounded-full"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-fit">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border-2 border-blue-300 shadow-[0_3px_0_0_rgba(59,130,246,0.3)]">
                        <div className="text-xs font-bold text-blue-600 uppercase mb-1">
                          Commits
                        </div>
                        <div className="text-2xl font-black text-blue-700">
                          {stats.commits}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border-2 border-purple-300 shadow-[0_3px_0_0_rgba(147,51,234,0.3)]">
                        <div className="text-xs font-bold text-purple-600 uppercase mb-1">
                          Pull Requests
                        </div>
                        <div className="text-2xl font-black text-purple-700">
                          {stats.prs}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 border-2 border-orange-300 shadow-[0_3px_0_0_rgba(249,115,22,0.3)]">
                        <div className="text-xs font-bold text-orange-600 uppercase mb-1">
                          Issues
                        </div>
                        <div className="text-2xl font-black text-orange-700">
                          {stats.issues}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-3 border-2 border-pink-300 shadow-[0_3px_0_0_rgba(236,72,153,0.3)]">
                        <div className="text-xs font-bold text-pink-600 uppercase mb-1">
                          Reviews
                        </div>
                        <div className="text-2xl font-black text-pink-700">
                          {stats.reviews}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t-2 border-slate-200">
                      <div className="flex justify-between items-center gap-2 bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-3 shadow-[0_3px_0_0_rgba(0,0,0,0.2)]">
                        <span className="text-sm whitespace-nowrap  font-bold text-white uppercase">
                          Total Contributions
                        </span>
                        <span className="text-2xl font-black text-white">
                          {stats.totalContributions}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {availableYears.length > 0 && (
              <div>
                <label className="block text-sm mb-2">Select Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1 items-center justify-center mr-4">
          <div className="bg-gray-800 flex gap-2 p-6 rounded-lg justify-center items-center w-fit overflow-x-auto custom-scrollbar">
            <div className=" relative flex-col justify-between items-center w-full">
              {/* Month labels, aligned to matrix */}
              {(() => {
                const weeksCount = data.matrix.length;
                const gapPx = 4;
                const colPx = 11;
                const segments = [] as Array<{ label?: string; span: number }>;
                if (weeksCount > 0) {
                  const labels = monthLabels;
                  let cursor = 0;
                  for (let i = 0; i < labels.length; i++) {
                    const start = labels[i].position;
                    const end =
                      i + 1 < labels.length
                        ? labels[i + 1].position
                        : weeksCount;
                    if (start > cursor) segments.push({ span: start - cursor });
                    const span = Math.max(1, end - start);
                    segments.push({ label: labels[i].month, span });
                    cursor = end;
                  }
                  if (cursor < weeksCount)
                    segments.push({ span: weeksCount - cursor });
                }
                return (
                  <div
                    className="w-full"
                    style={{
                      paddingLeft: "32px",
                      height: "20px",
                      marginBottom: "8px",
                      display: "grid",
                      gridTemplateColumns: `repeat(${data.matrix.length}, ${colPx}px)`,
                      columnGap: `${gapPx}px`,
                    }}
                  >
                    {segments.map((seg, idx) => (
                      <div
                        key={idx}
                        style={{ gridColumn: `span ${seg.span}` }}
                        className={`text-xs text-gray-400 ${
                          seg.label ? "text-center" : ""
                        }`}
                      >
                        {seg.label ?? ""}
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="flex pr-4">
                <div
                  className="flex flex-col text-xs text-gray-400 mr-4 justify-between items-baseline"
                  style={{ width: "32px" }}
                >
                  <div className="w-full text-start" style={{ height: "14px" }}>
                    Sun
                  </div>
                  <div className="w-full text-start" style={{ height: "14px" }}>
                    Wed
                  </div>
                  <div className="w-full text-start" style={{ height: "14px" }}>
                    Sat
                  </div>
                </div>
                <div className="flex gap-1 w-full ">
                  {data.matrix &&
                    data.matrix.map(
                      (week: (DayCell | null)[], weekIdx: number) => (
                        <div
                          key={weekIdx}
                          className="flex flex-col gap-1 flex-none"
                          style={{ width: "11px" }}
                        >
                          {week.map((day, dayIdx) => {
                            if (!day) {
                              return (
                                <div
                                  key={dayIdx}
                                  style={{ width: "11px", height: "11px" }}
                                />
                              );
                            }
                            const level = getContributionLevel(day.count);
                            return (
                              <div
                                key={dayIdx}
                                className="group relative w-full"
                                style={{
                                  width: "11px",
                                  height: "11px",
                                  backgroundColor: getLevelColor(level),
                                  borderRadius: "2px",
                                  cursor: "pointer",
                                }}
                              >
                                <div
                                  className="absolute hidden group-hover:block bg-gray-700 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap pointer-events-none"
                                  style={{
                                    bottom: "120%",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                  }}
                                >
                                  <div className="font-semibold">
                                    {day.count} contributions
                                  </div>
                                  <div className="text-gray-300">
                                    {new Date(day.date).toLocaleDateString(
                                      "en-US",
                                      {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      }
                                    )}
                                  </div>
                                  <div
                                    className="absolute w-2 h-2 bg-gray-700 transform rotate-45"
                                    style={{
                                      bottom: "-4px",
                                      left: "50%",
                                      marginLeft: "-4px",
                                    }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    style={{
                      width: "11px",
                      height: "11px",
                      backgroundColor: getLevelColor(level),
                      borderRadius: "2px",
                    }}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
          <div className=" text-sm max-w-[250px] text-gray-400 bg-gray-800 p-4 rounded-lg">
            <div className="mb-2">
              <span className="font-bold">Note:</span> This heatmap shows GitHub
              contributions including commits, pull requests, issues opened, and
              code reviews.
            </div>
            <div className="">
              Data is merged all-time. Score and streaks are processed by the
              backend for efficiency and ranking purposes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubHeatmap;
