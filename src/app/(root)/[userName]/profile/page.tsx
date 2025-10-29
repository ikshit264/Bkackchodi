"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GetUserByUserName } from "../../../../components/actions/user";
import ProfileForm from "../../../../components/shared/ProfileForm";
import Loading from "../../loading";
import GitHubHeatmap from "../../../../components/dashboard/GithubHeatMap";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
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
    return <div className="text-center text-red-500 text-lg">User not found</div>;
  }

  return (
    <div className="flex justify-center items-center  p-4">
      <div className="w-full bg-white rounded-lg p-6">

        <div className="text-xl font-semibold mb-2">
                <span className="text-black">@{userName}</span>
              </div>

        <ProfileForm user={user} />
        <GitHubHeatmap UserToken={user.githubToken} userName={user.userName} />
      </div>
    </div>
  );
};

export default ProfilePage;