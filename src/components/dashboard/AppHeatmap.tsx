"use client";

import React, { useState, useEffect } from "react";
import Loading from "../../app/(root)/loading";

interface DayCell {
  date: string;
  count: number;
  types?: Record<string, number>;
}

interface ContributionStats {
  totalContributions: number;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  contributionsByType: Record<string, number>;
  firstContributionDate: string | null;
  lastContributionDate: string | null;
}

interface AppHeatmapData {
  matrix: (DayCell | null)[][];
  stats: ContributionStats;
  year: number;
  availableYears: number[];
}

const AppHeatmap = ({ userId }: { userId: string }) => {
  const [data, setData] = useState<AppHeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/contributions/user/${userId}/heatmap?year=${selectedYear}`
        );
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setData(json.data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId, selectedYear]);

  if (loading) return <Loading />;
  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 p-4">
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
      <div className="text-center text-lg text-white min-h-[400px] flex items-center justify-center">
        No contribution data found. Start completing projects and courses to see your activity!
      </div>
    );

  // === Heatmap helpers ===
  const getContributionLevel = (count: number) => {
    if (count === 0) return 0;
    if (count < 3) return 1;
    if (count < 6) return 2;
    if (count < 10) return 3;
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
  const stats = data.stats || {
    totalContributions: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalActiveDays: 0,
    contributionsByType: {},
  };

  // Contribution type labels
  const typeLabels: Record<string, string> = {
    PROJECT_COMPLETED: "Projects Completed",
    PROJECT_STARTED: "Projects Started",
    COURSE_COMPLETED: "Courses Completed",
    COURSE_STARTED: "Courses Started",
    COURSE_CREATED: "Courses Created",
    BADGE_EARNED: "Badges Earned",
    LOGIN: "Logins",
    COMMENT: "Comments",
    GROUP_JOINED: "Groups Joined",
    SECTOR_JOINED: "Sectors Joined",
    PROJECT_EVALUATED: "Projects Evaluated",
  };

  return (
    <div className="text-white p-8">
      <div className="w-full">
        <div className="bg-gray-800 p-6 rounded-lg mb-8 flex flex-wrap justify-between items-center gap-4">
          <div>
            <div>APP CONTRIBUTIONS : </div>
            <div className="text-2xl font-bold text-blue-400">Activity Heatmap</div>
          </div>

          <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 transform transition-transform hover:-translate-y-1 relative z-10">
            <div className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.15)] border-4 border-slate-800 p-6 cursor-pointer transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_0_0_rgba(0,0,0,0.2)]">
              <div className="text-center">
                <div className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Current Streak
                </div>
                <div className="text-5xl font-black text-white">
                  {stats.currentStreak} {stats.currentStreak === 1 ? "day" : "days"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 transform transition-transform hover:-translate-y-1 relative z-10">
            <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.15)] border-4 border-slate-800 p-6 cursor-pointer transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_0_0_rgba(0,0,0,0.2)]">
              <div className="text-center">
                <div className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Longest Streak
                </div>
                <div className="text-5xl font-black text-white">
                  {stats.longestStreak} {stats.longestStreak === 1 ? "day" : "days"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 transform transition-transform hover:-translate-y-1 relative z-10">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.15)] border-4 border-slate-800 p-6 cursor-pointer transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_0_0_rgba(0,0,0,0.2)]">
              <div className="text-center">
                <div className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Total Contributions
                </div>
                <div className="text-5xl font-black text-white">
                  {stats.totalContributions}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {data.availableYears.length > 0 && (
              <div>
                <label className="block text-sm mb-2">Select Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  {data.availableYears.map((year) => (
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
            <div className="relative flex-col justify-between items-center w-full">
              {/* Month labels */}
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
                <div className="flex gap-1 w-full">
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
                                    {day.count} contribution{day.count !== 1 ? "s" : ""}
                                  </div>
                                  <div className="text-gray-300">
                                    {new Date(day.date).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </div>
                                  {day.types && Object.keys(day.types).length > 0 && (
                                    <div className="mt-1 pt-1 border-t border-gray-600">
                                      {Object.entries(day.types).map(([type, count]) => (
                                        <div key={type} className="text-xs">
                                          {typeLabels[type] || type}: {count}
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
          <div className="text-sm max-w-[250px] text-gray-400 bg-gray-800 p-4 rounded-lg">
            <div className="mb-2">
              <span className="font-bold">Note:</span> This heatmap shows your app
              activity including projects completed, courses started, badges earned, and
              other contributions.
            </div>
            <div className="">
              Data is tracked daily. Streaks are calculated based on consecutive days
              with at least one contribution.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppHeatmap;












