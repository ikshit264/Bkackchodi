"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GetUserByUserName } from "../../../../components/actions/user";
import ProfileForm from "../../../../components/shared/ProfileForm";
import Loading from "../../loading";
import GitHubHeatmap from "../../../../components/dashboard/GithubHeatMap";
import { fetchGitHubStatsForYear } from "../../../../components/actions/user/Calculation";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
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
  const userName = params.userName as string;

  useEffect(() => {
    const fetchUser = async () => {
      if (userName) {
        try {
          const userData = await GetUserByUserName(userName);
          setUser(userData);
        } catch (error) {
          console.error("Error fetching user:", error);
        } finally {
          setLoading(false);
          const res = await fetchGitHubStatsForYear("vidyasagar-dadilwar");
          if (res) {
            setRankData(res);
          }
          console.log(res);
        }
      } else {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userName]);

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 border-4 border-red-500">
          <div className="text-center text-red-500 text-xl font-bold">
            User not found
          </div>
        </div>
      </div>
    );
  }

  const stats = RankData?.stats || {
    commits: 0,
    issues: 0,
    prs: 0,
    reviews: 0,
    totalContributions: 0,
    stars: 0,
    followers: 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Card with Score */}
        <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6 transform transition-transform hover:-translate-y-1 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Username Section */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-3 shadow-[0_4px_0_0_rgba(0,0,0,0.2)]">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide">
                  Developer Profile
                </div>
                <div className="text-2xl font-bold text-slate-800">
                  @{userName}
                </div>
              </div>
            </div>

            {/* Score Card with Hover Stats */}
            <div className="relative group z-50">
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.15)] border-4 border-slate-800 p-6 cursor-pointer transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_0_0_rgba(0,0,0,0.2)]">
                <div className="text-center">
                  <div className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                    Developer Score
                  </div>
                  <div className="text-5xl font-black text-white">
                    {RankData?.score?.toFixed(1) || "0.0"}
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

        {/* Profile Form Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6 transform transition-transform hover:-translate-y-1 relative z-0">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
              Profile Settings
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-600 mt-2 rounded-full"></div>
          </div>
          <ProfileForm user={user} />
        </div>

        {/* GitHub Heatmap Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6 transform transition-transform hover:-translate-y-1 relative z-0">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
              Contribution Activity
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-teal-600 mt-2 rounded-full"></div>
          </div>
          <GitHubHeatmap
            userName={user.userName}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
