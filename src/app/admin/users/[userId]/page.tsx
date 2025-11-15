"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Mail,
  Calendar,
  BookOpen,
  Users,
  Trophy,
  Key,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
} from "lucide-react";
import Loading from "../../../(root)/loading";

interface UserDetail {
  id: string;
  userName: string;
  name: string;
  lastName: string;
  email: string;
  clerkId: string;
  githubId: string | null;
  githubOwnerid: string | null;
  githubToken: string | null;
  geminiApiKey: string | null;
  groqApiKey: string | null;
  avatar: string | null;
  collegeName: string | null;
  graduationYear: number | null;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  score: {
    totalActiveDays: number;
    currentStreak: number;
    longestStreak: number;
    finalScore: number;
    pullRequests: number;
    commits: number;
    review: number;
    issue: number;
    contribution: number;
    rank: number | null;
    lastUpdatedDate: Date;
  } | null;
  courses: Array<{ id: string; title: string; status: string; batch?: Array<unknown>; group?: { name?: string } | null }>;
  groupMemberships: Array<{ id: string; joinedAt: string; group: { id: string; name: string } }>;
  groupScores: Array<{ id: string; rank: number | null; finalScore: number; group: { name: string } }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);

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

        const response = await fetch(`/api/admin/users/${params.userId}`);
        if (response.ok) {
          const data = await response.json();
          setUserData(data.data);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [isLoaded, clerkUser, params.userId, router]);

  if (!isLoaded || loading) {
    return <Loading />;
  }

  if (!isAdminUser || !userData) {
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
          <div className="flex items-center space-x-4 mb-4">
            {userData.avatar && (
              <img
                src={userData.avatar}
                alt={userData.userName}
                className="w-20 h-20 rounded-full"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {userData.name} {userData.lastName}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                @{userData.userName}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Details Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Personal Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Email</p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {userData.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Joined</p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(userData.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {userData.collegeName && (
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-neutral-500" />
                    <div>
                      <p className="text-sm text-neutral-500">College</p>
                      <p className="text-gray-900 dark:text-gray-100">
                        {userData.collegeName}
                        {userData.graduationYear && ` • ${userData.graduationYear}`}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-sm text-neutral-500">Onboarding</p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {userData.onboardingCompleted ? "Completed" : "Pending"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Details Card */}
            {userData.score && (
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <span>Score Details</span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-primary-500 to-secondary-500 p-4 rounded-lg text-white">
                    <p className="text-sm opacity-90">Final Score</p>
                    <p className="text-2xl font-bold">
                      {userData.score.finalScore.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Rank
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      #{userData.score.rank || "N/A"}
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Active Days
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userData.score.totalActiveDays}
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Current Streak
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userData.score.currentStreak} days
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Longest Streak
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userData.score.longestStreak} days
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Commits
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userData.score.commits.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Pull Requests
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userData.score.pullRequests.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Issues
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userData.score.issue.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Reviews
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userData.score.review.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Contributions
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {userData.score.contribution.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Last Updated
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {new Date(
                        userData.score.lastUpdatedDate
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Courses Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <BookOpen className="w-6 h-6 text-primary-500" />
                <span>Courses ({userData.courses.length})</span>
              </h2>
              {userData.courses.length === 0 ? (
                <p className="text-neutral-500">No courses yet</p>
              ) : (
                <div className="space-y-3">
                  {userData.courses.map((course) => (
                    <div
                      key={course.id}
                      className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/courses/${course.id}`)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(course.status)}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {course.title}
                            </p>
                            <p className="text-sm text-neutral-500">
                              {course.batch?.length || 0} batches •{" "}
                              {course.group?.name || "No group"}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-700">
                          {course.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Group Memberships */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <Users className="w-6 h-6 text-primary-500" />
                <span>
                  Group Memberships (
                  {userData.groupMemberships.length})
                </span>
              </h2>
              {userData.groupMemberships.length === 0 ? (
                <p className="text-neutral-500">Not a member of any group</p>
              ) : (
                <div className="space-y-3">
                  {userData.groupMemberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/groups/${membership.group.id}`)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {membership.group.name}
                          </p>
                          <p className="text-sm text-neutral-500">
                            Joined:{" "}
                            {new Date(
                              membership.joinedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Group Scores */}
            {userData.groupScores.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                  <TrendingUp className="w-6 h-6 text-primary-500" />
                  <span>Group Scores</span>
                </h2>
                <div className="space-y-3">
                  {userData.groupScores.map((groupScore) => (
                    <div
                      key={groupScore.id}
                      className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {groupScore.group.name}
                          </p>
                          <p className="text-sm text-neutral-500">
                            Rank: #{groupScore.rank || "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-500">
                            {groupScore.finalScore.toLocaleString()}
                          </p>
                          <p className="text-xs text-neutral-500">Score</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* API Keys (masked) */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <Key className="w-6 h-6 text-primary-500" />
                <span>API Keys</span>
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">GitHub Token</p>
                  <p className="text-xs font-mono bg-neutral-100 dark:bg-neutral-700 p-2 rounded break-all">
                    {userData.githubToken
                      ? `${userData.githubToken.substring(0, 10)}...`
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">GitHub ID</p>
                  <p className="text-xs text-gray-900 dark:text-gray-100">
                    {userData.githubId || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Gemini API Key</p>
                  <p className="text-xs font-mono bg-neutral-100 dark:bg-neutral-700 p-2 rounded break-all">
                    {userData.geminiApiKey
                      ? `${userData.geminiApiKey.substring(0, 10)}...`
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Groq API Key</p>
                  <p className="text-xs font-mono bg-neutral-100 dark:bg-neutral-700 p-2 rounded break-all">
                    {userData.groqApiKey
                      ? `${userData.groqApiKey.substring(0, 10)}...`
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Clerk ID</p>
                  <p className="text-xs font-mono text-gray-900 dark:text-gray-100">
                    {userData.clerkId}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Quick Stats
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Total Courses
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {userData.courses.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Groups Joined
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {userData.groupMemberships.length}
                  </span>
                </div>
                {userData.score && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        Total Score
                      </span>
                      <span className="font-bold text-primary-500">
                        {userData.score.finalScore.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        Global Rank
                      </span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        #{userData.score.rank || "N/A"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
