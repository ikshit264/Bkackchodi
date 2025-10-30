import React, { useState, useEffect } from "react";
import Loading from "../../app/(root)/loading";

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
}

const GitHubHeatmap = ({
  userName,
}: {
  userName: string;
}) => {
  const [data, setData] = useState<BackendScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/query/score?userName=${userName}&year=${selectedYear}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(res => {
        if (res.error) throw new Error(res.error);
        setData(res);
        if (res.availableYears) setAvailableYears(res.availableYears);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [userName, selectedYear]);



  if (loading ) return <Loading />;
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
    return <div className="text-center text-lg">No contribution data found.</div>;

  // Color levels: (same as before)
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
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  // Calculating month labels for matrix (month shown at new block)
  const getMonthLabels = () => {
    if (!data.matrix) return [];
    const labels = [] as { month: string; position: number }[];
    let lastMonth = -1;
    data.matrix.forEach((week: (DayCell | null)[], weekIndex: number) => {
      const firstValidDay = week.find((day) => day && (day as DayCell).date);
      if (firstValidDay) {
        const date = new Date((firstValidDay as DayCell).date);
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

  return (
    <div className=" text-white p-8">
      <div className="w-full">
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {data.contribution} contributions in {selectedYear}
              </div>
              <div className="text-md text-green-200 mt-2">
                Final Score: <span className="text-lg font-bold">{data.finalScore?.toFixed(1)}</span>
                {typeof data.rank === "number" && (
                  <span className="ml-4 text-gray-300">Rank: <span className="font-bold">#{data.rank ?? "--"}</span></span>
                )}
              </div>
            </div>
            {availableYears.length > 0 && (
              <div>
                <div className="block text-sm font-medium mb-2">Select Year</div>
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
                    const end = i + 1 < labels.length ? labels[i + 1].position : weeksCount;
                    if (start > cursor) segments.push({ span: start - cursor });
                    const span = Math.max(1, end - start);
                    segments.push({ label: labels[i].month, span });
                    cursor = end;
                  }
                  if (cursor < weeksCount) segments.push({ span: weeksCount - cursor });
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
                        className={`text-xs text-gray-400 ${seg.label ? "text-center" : ""}`}
                      >
                        {seg.label ?? ""}
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="flex pr-4">
                <div className="flex flex-col text-xs text-gray-400 mr-4 justify-between items-baseline" style={{ width: "32px" }}>
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
                    data.matrix.map((week: (DayCell | null)[], weekIdx: number) => (
                      <div key={weekIdx} className="flex flex-col gap-1 flex-none" style={{ width: "11px" }}>
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
                                  {new Date(day.date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
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
                    ))}
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
              Data is merged all-time. Score and streaks are processed by the backend for efficiency and ranking purposes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubHeatmap;
