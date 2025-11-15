"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  BookOpen,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Folder,
  FileCode,
  TrendingUp,
  Users,
} from "lucide-react";
import Loading from "../../../(root)/loading";

interface CourseDetail {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    userName: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  group: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  batch: Array<{
    id: string;
    number: number;
    status: string;
    createdAt: Date;
    projects: Array<{
      id: string;
      title: string;
      description: string;
      level: string;
      status: string;
      position: number;
      learningObjectives: unknown;
      steps: unknown;
      GithubData: unknown;
      githubRepo: unknown;
    }>;
  }>;
  progress: {
    totalProjects: number;
    completedProjects: number;
    percentage: number;
  };
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [courseData, setCourseData] = useState<CourseDetail | null>(null);
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

        const response = await fetch(`/api/admin/courses/${params.courseId}`);
        if (response.ok) {
          const data = await response.json();
          setCourseData(data.data);
        }
      } catch (error) {
        console.error("Error fetching course details:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [isLoaded, clerkUser, params.courseId, router]);

  if (!isLoaded || loading) {
    return <Loading />;
  }

  if (!isAdminUser || !courseData) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "in progress":
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
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
            <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {courseData.title}
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    courseData.status
                  )}`}
                >
                  {courseData.status}
                </span>
                {courseData.group && (
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Group: {courseData.group.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <Folder className="w-8 h-8 text-primary-500" />
              <div>
                <p className="text-sm text-neutral-500">Batches (Modules)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {courseData.batch.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <FileCode className="w-8 h-8 text-primary-500" />
              <div>
                <p className="text-sm text-neutral-500">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {courseData.progress.totalProjects}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-neutral-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {courseData.progress.completedProjects}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-primary-500" />
              <div>
                <p className="text-sm text-neutral-500">Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {courseData.progress.percentage}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Course Progress
            </span>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {courseData.progress.completedProjects} /{" "}
              {courseData.progress.totalProjects} projects
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-primary-500 to-secondary-500 h-4 rounded-full transition-all"
              style={{ width: `${courseData.progress.percentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Owner */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <User className="w-6 h-6 text-primary-500" />
                <span>Course Creator</span>
              </h2>
              <div
                className="flex items-center space-x-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                onClick={() => router.push(`/admin/users/${courseData.user.id}`)}
              >
                {courseData.user.avatar && (
                  <img
                    src={courseData.user.avatar}
                    alt={courseData.user.userName}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {courseData.user.name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    @{courseData.user.userName}
                  </p>
                  <p className="text-xs text-neutral-400">{courseData.user.email}</p>
                </div>
              </div>
            </div>

            {/* Group Info */}
            {courseData.group && (
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                  <Users className="w-6 h-6 text-primary-500" />
                  <span>Group</span>
                </h2>
                <div
                  className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                  onClick={() => router.push(`/admin/groups/${courseData.group!.id}`)}
                >
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {courseData.group.name}
                  </p>
                  {courseData.group.description && (
                    <p className="text-sm text-neutral-500 mt-1">
                      {courseData.group.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Batches (Modules) */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <Folder className="w-6 h-6 text-primary-500" />
                <span>Batches (Modules) ({courseData.batch.length})</span>
              </h2>
              {courseData.batch.length === 0 ? (
                <p className="text-neutral-500">No batches yet</p>
              ) : (
                <div className="space-y-6">
                  {courseData.batch.map((batch) => (
                    <div
                      key={batch.id}
                      className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(batch.status)}
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                              Batch {batch.number}
                            </h3>
                            <p className="text-sm text-neutral-500">
                              {batch.projects.length} projects
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            batch.status
                          )}`}
                        >
                          {batch.status}
                        </span>
                      </div>

                      {/* Projects in this batch */}
                      <div className="space-y-3 ml-8">
                        {batch.projects.map((project) => (
                          <div
                            key={project.id}
                            className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg border border-neutral-200 dark:border-neutral-700"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <FileCode className="w-4 h-4 text-primary-500" />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {project.title}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    Position: {project.position} • Level:{" "}
                                    {project.level}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                  project.status
                                )}`}
                              >
                                {project.status}
                              </span>
                            </div>
                            {project.description && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                                {project.description}
                              </p>
                            )}
                            {project.learningObjectives && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-neutral-500 mb-1">
                                  Learning Objectives:
                                </p>
                                <ul className="text-xs text-neutral-600 dark:text-neutral-400 list-disc list-inside">
                                  {typeof project.learningObjectives === "object" &&
                                    Object.entries(project.learningObjectives).map(
                                      ([key, value]: [string, unknown]) => (
                                        <li key={key}>{String(value)}</li>
                                      )
                                    )}
                                </ul>
                              </div>
                            )}
                            {project.githubRepo && (
                              <div className="mt-2">
                                <p className="text-xs text-neutral-500">
                                  GitHub Repo:{" "}
                                  {typeof project.githubRepo === "object"
                                    ? JSON.stringify(project.githubRepo)
                                    : String(project.githubRepo)}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Info */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Course Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-neutral-500">Status</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {courseData.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Created</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(courseData.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Last Updated</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(courseData.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Progress</p>
                  <p className="font-bold text-primary-500">
                    {courseData.progress.percentage}%
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
                    Total Batches
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {courseData.batch.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Total Projects
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {courseData.progress.totalProjects}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Completed
                  </span>
                  <span className="font-bold text-green-500">
                    {courseData.progress.completedProjects}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Remaining
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {courseData.progress.totalProjects -
                      courseData.progress.completedProjects}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

