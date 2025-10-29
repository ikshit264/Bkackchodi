/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import Loading from "../../app/(root)/loading";

const GitHubHeatmap = ({
  userName,
  UserToken,
}: {
  userName: string;
  UserToken: string;
}) => {
  const [contributionData, setContributionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyStats, setYearlyStats] = useState({});
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [availableYears, setAvailableYears] = useState([]);

  const fetchContributionsForYear = async (user, authToken, year) => {
    const fromDate = `${year}-01-01T00:00:00Z`;
    const toDate = `${year}-12-31T23:59:59Z`;

    const query = `
      query($userName: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $userName) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  weekday
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: {
            userName: user,
            from: fromDate,
            to: toDate,
          },
        }),
      });

      const result = await response.json();

      console.log("result", result);

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (!result.data || !result.data.user) {
        throw new Error("User not found");
      }

      return result.data.user.contributionsCollection.contributionCalendar;
    } catch (err) {
      throw err;
    }
  };

  const fetchAllYearsData = async (user, authToken) => {
    setLoading(true);
    setError(null);

    try {
      const currentYear = new Date().getFullYear();
      const years = [];
      const stats = {};

      for (let year = 2008; year <= currentYear; year++) {
        years.push(year);
      }

      setAvailableYears(years);

      const calendar = await fetchContributionsForYear(
        user,
        authToken,
        selectedYear
      );

      const processedData = processYearData(calendar, selectedYear);
      setContributionData(processedData);

      stats[selectedYear] = {
        total: calendar.totalContributions,
        data: processedData,
      };

      setYearlyStats(stats);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const processYearData = (calendar, year) => {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const startDayOfWeek = (startOfYear.getDay() + 6) % 7;

    const allWeeks = [];
    let currentWeek = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }
    if (startDayOfWeek === 0) {
      // GitHub week starts Sunday → no shift
    } else {
      // shift so first real day aligns correctly
      currentWeek = new Array(startDayOfWeek).fill(null);
    }

    const daysInYear =
      Math.ceil(
        (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    const contributionMap = {};

    calendar.weeks.forEach((week) => {
      week.contributionDays.forEach((day) => {
        contributionMap[day.date] = day.contributionCount;
      });
    });

    for (let day = 0; day < daysInYear; day++) {
      const currentDate = new Date(year, 0, 1 + day);
      const dateString = currentDate.toISOString().split("T")[0];

      currentWeek.push({
        date: dateString,
        contributionCount: contributionMap[dateString] || 0,
        weekday: currentDate.getDay(),
      });

      if (currentWeek.length === 7) {
        allWeeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      allWeeks.push(currentWeek);
    }

    return allWeeks;
  };

  useEffect(() => {
    setUsername(userName);
    setToken(UserToken);
    fetchAllYearsData(userName, UserToken);
  }, [userName, UserToken]);

  useEffect(() => {
    if (username && token && !loading) {
      changeYear(selectedYear);
    }
  }, [selectedYear]);

  const changeYear = async (year) => {
    if (yearlyStats[year]) {
      setContributionData(yearlyStats[year].data);
      return;
    }

    setLoading(true);
    try {
      const calendar = await fetchContributionsForYear(username, token, year);
      const processedData = processYearData(calendar, year);

      setContributionData(processedData);
      setYearlyStats((prev) => ({
        ...prev,
        [year]: {
          total: calendar.totalContributions,
          data: processedData,
        },
      }));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getContributionLevel = (count) => {
    if (count === 0) return 0;
    if (count < 5) return 1;
    if (count < 10) return 2;
    if (count < 15) return 3;
    return 4;
  };

  const getLevelColor = (level) => {
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
    if (!contributionData) return [];

    const labels = [];
    let lastMonth = -1;

    contributionData.forEach((week, weekIndex) => {
      const firstValidDay = week.find((day) => day !== null);
      if (firstValidDay) {
        const date = new Date(firstValidDay.date);
        const month = date.getMonth();

        if (month !== lastMonth && date.getDate() <= 7) {
          labels.push({
            month: months[month],
            position: weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  };

  const getTotalContributions = () => {
    if (!contributionData) return 0;
    let total = 0;
    contributionData.forEach((week) => {
      week.forEach((day) => {
        if (day) total += day.contributionCount;
      });
    });
    return total;
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
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
  }

  const monthLabels = getMonthLabels();
  const totalContributions = getTotalContributions();

  return (
    <div className="  text-white p-8">
      <div className="w-full">
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              
              <div className="text-2xl font-bold text-green-400">
                {totalContributions} contributions in {selectedYear}
              </div>
            </div>

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
          </div>
        </div>

        <div className="bg-gray-800 flex gap-2 p-6 rounded-lg justify-center w-full">
          <div className=" relative flex-col justify-between items-center  w-fit">
            <div
              className="flex justify-between items-center w-full"
              style={{
                paddingLeft: "32px",
                height: "20px",
                marginBottom: "8px",
              }}
            >
              {monthLabels.map((label, idx) => (
                <div
                  key={idx}
                  className=" text-xs text-gray-400 w-full text-center"
                >
                  {label.month}
                </div>
              ))}
            </div>

            <div className="flex">
              <div className="flex flex-col text-xs text-gray-400 mr-4 justify-between items-baseline">
                <div className="w-full text-start" style={{ height: "14px" }}>
                  Sun
                </div>
                {/* <div className='w-full text-start' style={{ height: '14px' }}>Mon</div> */}
                {/* <div className='w-full text-start' style={{ height: '14px' }}>Tue</div> */}
                <div className="w-full text-start" style={{ height: "14px" }}>
                  Wed
                </div>
                {/* <div className='w-full text-start' style={{ height: '14px' }}>Thur</div> */}
                {/* <div className='w-full text-start' style={{ height: '14px' }}>Fri</div> */}
                <div className="w-full text-start" style={{ height: "14px" }}>
                  Sat
                </div>
              </div>

              <div className="flex gap-1 w-full">
                {contributionData &&
                  contributionData.map((week, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-1 w-full">
                      {week.map((day, dayIdx) => {
                        if (!day) {
                          return (
                            <div
                              key={dayIdx}
                              style={{
                                width: "11px",
                                height: "11px",
                              }}
                            />
                          );
                        }

                        const level = getContributionLevel(
                          day.contributionCount
                        );
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
                                {day.contributionCount} contributions
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

        <div className="mt-6 text-sm text-gray-400 bg-gray-800 p-4 rounded-lg">
          <div className="mb-2">
            <span className="font-bold">Note:</span> This heatmap shows GitHub
            contributions including commits, pull requests, issues opened, and
            code reviews.
          </div>
          <div className="mb-2">
            Data is organized by year, month, and weeks. Select different years
            to view historical contribution data.
          </div>
          <div>
            To get your own token, visit GitHub Settings → Developer settings →
            Personal access tokens
          </div>
          <div className="mt-2">
            Required scope:{" "}
            <span className="bg-gray-700 px-2 py-1 rounded">read:user</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubHeatmap;
