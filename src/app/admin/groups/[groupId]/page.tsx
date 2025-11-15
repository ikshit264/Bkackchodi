"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Users,
  BookOpen,
  Trophy,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Plus,
  X,
  RefreshCw,
} from "lucide-react";
import Loading from "../../../(root)/loading";

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  type?: string;
  icon?: string | null;
  creatorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    userName: string;
    name: string;
    email: string;
  } | null;
  members: Array<{
    id: string;
    joinedAt: Date;
    user: {
      id: string;
      userName: string;
      name: string;
      email: string;
      avatar: string | null;
      score: {
        finalScore: number;
        rank: number | null;
      } | null;
    };
  }>;
  scores: Array<{
    id: string;
    userId: string;
    finalScore: number;
    rank: number | null;
    commits: number;
    pullRequests: number;
    user: {
      id: string;
      userName: string;
      name: string;
    };
  }>;
  courses: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    user: {
      id: string;
      userName: string;
      name: string;
    };
    batch: Array<{
      id: string;
      number: number;
      status: string;
      projects: Array<{
        id: string;
        title: string;
        status: string;
        position: number;
      }>;
    }>;
  }>;
  _count: {
    members: number;
    courses: number;
    scores: number;
  };
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [groupData, setGroupData] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "members">("overview");
  interface AdminUser {
    id: string;
    userName: string;
    name?: string;
    email?: string;
    avatar?: string | null;
    score?: { finalScore: number } | null;
    groupMemberships?: Array<unknown> | null;
  }
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [removingUser, setRemovingUser] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (!isLoaded || !clerkUser) return;

      try {
        const adminCheck = await fetch("/api/admin/check");
        const adminData = await adminCheck.json();
        if (!adminData.isAdmin) {
          router.push("/");
          return;
        }
        setIsAdminUser(true);

        const response = await fetch(`/api/admin/groups/${params.groupId}`);
        if (response.ok) {
          const data = await response.json();
          setGroupData(data.data);
        }
      } catch (error) {
        console.error("Error fetching group details:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [isLoaded, clerkUser, params.groupId, router]);

  useEffect(() => {
    if (activeTab === "members" && isAdminUser) {
      fetchAllUsers();
    }
  }, [activeTab, isAdminUser, params.groupId]);

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (userId: string) => {
    setAddingUser(userId);
    try {
      const response = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupId: params.groupId }),
      });

      if (response.ok) {
        // Refresh group data
        const groupResponse = await fetch(`/api/admin/groups/${params.groupId}`);
        if (groupResponse.ok) {
          const data = await groupResponse.json();
          setGroupData(data.data);
        }
        alert("User added to group successfully");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add user");
      }
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Error adding user to group");
    } finally {
      setAddingUser(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user from the group?")) {
      return;
    }

    setRemovingUser(userId);
    try {
      const response = await fetch("/api/admin/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupId: params.groupId }),
      });

      if (response.ok) {
        // Refresh group data
        const groupResponse = await fetch(`/api/admin/groups/${params.groupId}`);
        if (groupResponse.ok) {
          const data = await groupResponse.json();
          setGroupData(data.data);
        }
        alert("User removed from group successfully");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to remove user");
      }
    } catch (error) {
      console.error("Error removing user:", error);
      alert("Error removing user from group");
    } finally {
      setRemovingUser(null);
    }
  };

  const refreshGroupData = async () => {
    try {
      const response = await fetch(`/api/admin/groups/${params.groupId}`);
      if (response.ok) {
        const data = await response.json();
        setGroupData(data.data);
      }
    } catch (error) {
      console.error("Error refreshing group data:", error);
    }
  };

  if (!isLoaded || loading) {
    return <Loading />;
  }

  if (!isAdminUser || !groupData) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "in progress":
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Calculate course progress
  const getCourseProgress = (course: { batch: { projects: { status: string }[] }[] }) => {
    const totalProjects = course.batch.reduce(
      (sum: number, batch: { projects: { status: string }[] }) => sum + batch.projects.length,
      0
    );
    const completedProjects = course.batch.reduce(
      (sum: number, batch: { projects: { status: string }[] }) =>
        sum +
        batch.projects.filter((p: { status: string }) => p.status === "completed").length,
      0
    );
    return {
      total: totalProjects,
      completed: completedProjects,
      percentage:
        totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0,
    };
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push("/admin")}
          className="mb-4 flex items-center space-x-2 text-primary-500 hover:text-primary-600"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Admin</span>
        </button>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {groupData.icon && (
                <span className="text-4xl">{groupData.icon}</span>
              )}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {groupData.name}
                  </h1>
                  {groupData.type === "CATEGORY" && (
                    <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 rounded">
                      CATEGORY
                    </span>
                  )}
                  {groupData.type === "CUSTOM" && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                      CUSTOM
                    </span>
                  )}
                </div>
                {groupData.description && (
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {groupData.description}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={refreshGroupData}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 border-b border-neutral-200 dark:border-neutral-700 mt-4">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "overview"
                  ? "text-primary-500 border-b-2 border-primary-500"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "members"
                  ? "text-primary-500 border-b-2 border-primary-500"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              Members Management
            </button>
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-primary-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Members</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {groupData._count.members}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-8 h-8 text-primary-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Courses</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {groupData._count.courses}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-3">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Scores</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {groupData._count.scores}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-8 h-8 text-primary-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Created</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {new Date(groupData.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Creator Info */}
                {groupData.creator && (
                  <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                      <User className="w-6 h-6 text-primary-500" />
                      <span>Created By</span>
                    </h2>
                    <div
                      className="flex items-center space-x-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/users/${groupData.creator!.id}`)
                      }
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {groupData.creator.name}
                        </p>
                        <p className="text-sm text-neutral-500">
                          @{groupData.creator.userName}
                        </p>
                        <p className="text-xs text-neutral-400">{groupData.creator.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Members */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                    <Users className="w-6 h-6 text-primary-500" />
                    <span>Members ({groupData.members.length})</span>
                  </h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                {groupData.members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                    onClick={() => router.push(`/admin/users/${member.user.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {member.user.avatar && (
                          <img
                            src={member.user.avatar}
                            alt={member.user.userName}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {member.user.name}
                          </p>
                          <p className="text-sm text-neutral-500">
                            @{member.user.userName}
                          </p>
                          <p className="text-xs text-neutral-400">
                            Joined: {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {member.user.score && (
                          <>
                            <p className="font-bold text-primary-500">
                              {member.user.score.finalScore.toLocaleString()}
                            </p>
                            <p className="text-xs text-neutral-500">
                              Rank: #{member.user.score.rank || "N/A"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                  </div>
                </div>

                {/* Leaderboard */}
                {groupData.scores.length > 0 && (
                  <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      <span>Leaderboard</span>
                    </h2>
                    <div className="space-y-2">
                  {groupData.scores.slice(0, 10).map((score, index) => (
                    <div
                      key={score.id}
                      className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                      onClick={() => router.push(`/admin/users/${score.userId}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="w-8 text-center font-bold text-neutral-500">
                            #{score.rank || index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {score.user.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              @{score.user.userName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary-500">
                            {score.finalScore.toLocaleString()}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {score.commits} commits • {score.pullRequests} PRs
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                    </div>
                  </div>
                )}

                {/* Courses */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                    <BookOpen className="w-6 h-6 text-primary-500" />
                    <span>Courses ({groupData.courses.length})</span>
                  </h2>
                  {groupData.courses.length === 0 ? (
                    <p className="text-neutral-500">No courses in this group</p>
                  ) : (
                    <div className="space-y-4">
                      {groupData.courses.map((course) => {
                        const progress = getCourseProgress(course);
                        return (
                          <div
                            key={course.id}
                            className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                            onClick={() =>
                              router.push(`/admin/courses/${course.id}`)
                            }
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                {getStatusIcon(course.status)}
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {course.title}
                                  </p>
                                  <p className="text-sm text-neutral-500">
                                    By {course.user.name} (@{course.user.userName})
                                  </p>
                                  <p className="text-xs text-neutral-400">
                                    Created:{" "}
                                    {new Date(course.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-700">
                                {course.status}
                              </span>
                            </div>
                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-neutral-600 dark:text-neutral-400">
                                  Progress
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {progress.completed}/{progress.total} projects (
                                  {progress.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                                <div
                                  className="bg-primary-500 h-2 rounded-full transition-all"
                                  style={{ width: `${progress.percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-neutral-500">
                              {course.batch.length} batches
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Group Stats */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                    Group Statistics
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        Total Members
                      </span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {groupData._count.members}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        Total Courses
                      </span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {groupData._count.courses}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        Total Scores
                      </span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {groupData._count.scores}
                      </span>
                    </div>
                    {groupData.scores.length > 0 && (
                      <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                        <p className="text-sm text-neutral-500 mb-2">Top Score</p>
                        <p className="text-2xl font-bold text-primary-500">
                          {groupData.scores[0]?.finalScore.toLocaleString() || 0}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "members" && (
          <div className="space-y-6">
            {/* Search and Add Section */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users by name, username, or email..."
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                  <p className="mt-2 text-neutral-500">Loading users...</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-700/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          Score
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          Groups
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {allUsers
                        .filter((user) => {
                          if (!searchTerm) return true;
                          const search = searchTerm.toLowerCase();
                          return (
                            user.name?.toLowerCase().includes(search) ||
                            user.userName?.toLowerCase().includes(search) ||
                            user.email?.toLowerCase().includes(search)
                          );
                        })
                        .map((user) => {
                          const isMember = groupData?.members.some(
                            (m) => m.user.id === user.id
                          );
                          return (
                            <tr
                              key={user.id}
                              className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                            >
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  {user.avatar && (
                                    <img
                                      src={user.avatar}
                                      alt={user.userName}
                                      className="w-8 h-8 rounded-full"
                                    />
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {user.name}
                                    </p>
                                    <p className="text-sm text-neutral-500">
                                      @{user.userName}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                                {user.email}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                {user.score?.finalScore ? (
                                  <span className="font-medium text-primary-500">
                                    {user.score.finalScore.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                                {user.groupMemberships?.length || 0} groups
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isMember ? (
                                  <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Member
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs rounded bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                                    Not Member
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isMember ? (
                                  <button
                                    onClick={() => handleRemoveUser(user.id)}
                                    disabled={removingUser === user.id}
                                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                  >
                                    {removingUser === user.id ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>Removing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <X className="w-3 h-3" />
                                        <span>Remove</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAddUser(user.id)}
                                    disabled={addingUser === user.id}
                                    className="px-3 py-1 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                  >
                                    {addingUser === user.id ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>Adding...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3 h-3" />
                                        <span>Add</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {allUsers.filter((user) => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      user.name?.toLowerCase().includes(search) ||
                      user.userName?.toLowerCase().includes(search) ||
                      user.email?.toLowerCase().includes(search)
                    );
                  }).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-neutral-500">No users found</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current Members Section */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <Users className="w-6 h-6 text-primary-500" />
                <span>Current Members ({groupData?.members.length || 0})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupData?.members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                    onClick={() => router.push(`/admin/users/${member.user.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {member.user.avatar && (
                          <img
                            src={member.user.avatar}
                            alt={member.user.userName}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {member.user.name}
                          </p>
                          <p className="text-sm text-neutral-500">
                            @{member.user.userName}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUser(member.user.id);
                        }}
                        disabled={removingUser === member.user.id}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove from group"
                      >
                        {removingUser === member.user.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {member.user.score && (
                      <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <p className="text-xs text-neutral-500">
                          Score:{" "}
                          <span className="font-medium text-primary-500">
                            {member.user.score.finalScore.toLocaleString()}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {(!groupData?.members || groupData.members.length === 0) && (
                <p className="text-center text-neutral-500 py-8">
                  No members in this group
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
