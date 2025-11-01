/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { GetUserByUserId } from "../../../../components/actions/user";
import ProfileForm from "../../../../components/shared/ProfileForm";
import Loading from "../../loading";
import GitHubHeatmap from "../../../../components/dashboard/GithubHeatMap";
import { useUser } from "@clerk/nextjs";

const ProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setUserData(null);
      return;
    }
    const fetchUser = async () => {
      const fetched = await GetUserByUserId(user.id);
      setUserData(fetched);
      setLoading(false);
      console.log("Fetched user data.", fetched.clerkId);
    };

    fetchUser();
  }, [isLoaded]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* GitHub Heatmap Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6 transform transition-transform hover:-translate-y-1 relative z-0">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
              Contribution Activity
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-teal-600 mt-2 rounded-full"></div>
          </div>
          <GitHubHeatmap userName={userData.userName} />
        </div>

        {/* Profile Form Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6 transform transition-transform hover:-translate-y-1 relative z-0">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
              Profile Settings
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-600 mt-2 rounded-full"></div>
          </div>
          <ProfileForm user={userData} />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
