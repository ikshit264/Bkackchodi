"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Users,
  BookOpen,
  Group,
  Trash2,
  Search,
  RefreshCw,
  BarChart3,
  Eye,
  Plus,
  X,
} from "lucide-react";
import Loading from "../(root)/loading";

type TabType = "users" | "courses" | "groups" | "analytics";

interface User {
  id: string;
  userName: string;
  name: string;
  email: string;
  createdAt: Date;
  courses: Array<{ id: string; title: string; [key: string]: unknown }>;
  groupMemberships: Array<{ id: string; [key: string]: unknown }>;
}

interface Course {
  id: string;
  title: string;
  status: string;
  user: {
    userName: string;
    name: string;
  };
  batch: Array<{ id: string; [key: string]: unknown }>;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  type?: string;
  icon?: string | null;
  members: Array<{ id: string; [key: string]: unknown }>;
  _count: {
    members: number;
  };
}

export default function AdminPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  interface AnalyticsOverview {
    totalUsers: number;
    totalCourses: number;
    totalGroups: number;
    activeUsers: number;
    averageScore: number;
    averageCommits: number;
    averagePRs: number;
    averageContributions: number;
  }
  interface TopUser {
    id: string;
    userId?: string;
    user: { userName: string; name: string; avatar?: string | null };
    finalScore: number;
  }
  interface AnalyticsData {
    overview: AnalyticsOverview;
    topUsers?: TopUser[];
    coursesByStatus?: Record<string, number>;
  }
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isLoaded || !clerkUser) return;

      try {
        const response = await fetch("/api/admin/check");
        const data = await response.json();
        if (data.isAdmin) {
          setIsAdminUser(true);
          fetchData();
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Error checking admin:", error);
        router.push("/");
      }
    };

    checkAdmin();
  }, [isLoaded, clerkUser, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, coursesRes, groupsRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/courses"),
        fetch("/api/admin/groups"),
        fetch("/api/admin/analytics"),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data || []);
      }
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.data || []);
      }
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData.data || []);
      }
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.data || null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setUsers(users.filter((u) => u.id !== userId));
        alert("User deleted successfully");
      } else {
        alert("Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error deleting user");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
      const response = await fetch("/api/admin/courses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (response.ok) {
        setCourses(courses.filter((c) => c.id !== courseId));
        alert("Course deleted successfully");
      } else {
        alert("Failed to delete course");
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Error deleting course");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const response = await fetch("/api/admin/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });

      if (response.ok) {
        setGroups(groups.filter((g) => g.id !== groupId));
        alert("Group deleted successfully");
      } else {
        alert("Failed to delete group");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Error deleting group");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert("Group name is required");
      return;
    }

    setCreatingGroup(true);
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add new group to the list
        setGroups([...groups, { ...data.data, _count: { members: 0 } }]);
        setShowCreateGroupModal(false);
        setNewGroupName("");
        setNewGroupDescription("");
        alert("Group created successfully");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create group");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Error creating group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCourses = courses.filter(
    (c) =>
      c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.user?.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(
    (g) =>
      g.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isLoaded || loading) {
    return <Loading />;
  }

  if (!isAdminUser) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Admin Dashboard
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Manage users, courses, and groups
            </p>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex space-x-4 border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "users"
                ? "border-primary-500 text-primary-500"
                : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Users ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("courses")}
            className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "courses"
                ? "border-primary-500 text-primary-500"
                : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Courses ({courses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "groups"
                ? "border-primary-500 text-primary-500"
                : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Group className="w-5 h-5" />
            <span>Groups ({groups.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "analytics"
                ? "border-primary-500 text-primary-500"
                : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Analytics</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
          {activeTab === "users" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Courses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Groups</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {user.userName}
                          </div>
                          <div className="text-sm text-neutral-500">{user.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.courses?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.groupMemberships?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/users/${user.id}`);
                            }}
                            className="text-primary-500 hover:text-primary-700"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "courses" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Batches</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {filteredCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                      onClick={() => router.push(`/admin/courses/${course.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {course.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {course.user?.userName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            course.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : course.status === "in progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {course.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {course.batch?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/courses/${course.id}`);
                            }}
                            className="text-primary-500 hover:text-primary-700"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCourse(course.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "groups" && (
            <>
              {/* Create Group Button */}
              <div className="mb-4 flex justify-end gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/admin/groups/init-categories", {
                        method: "POST",
                      });
                      if (res.ok) {
                        const data = await res.json();
                        alert(data.message || "Category groups initialized!");
                        fetchData();
                      } else {
                        const error = await res.json();
                        alert(error.error || "Failed to initialize category groups");
                      }
                    } catch (error) {
                      console.error("Error initializing category groups:", error);
                      alert("Error initializing category groups");
                    }
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Init Category Groups</span>
                </button>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Group</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Group</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Members</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {filteredGroups.map((group) => (
                    <tr
                      key={group.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                      onClick={() => router.push(`/admin/groups/${group.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {group.icon && <span className="text-xl">{group.icon}</span>}
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {group.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {group.type === "CATEGORY" ? (
                          <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            CATEGORY
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            CUSTOM
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {group.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {group._count?.members || group.members?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/groups/${group.id}`);
                            }}
                            className="text-primary-500 hover:text-primary-700"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Create Group Modal */}
            {showCreateGroupModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Create New Group
                    </h2>
                    <button
                      onClick={() => {
                        setShowCreateGroupModal(false);
                        setNewGroupName("");
                        setNewGroupDescription("");
                      }}
                      className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Group Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Enter group name"
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={creatingGroup}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="Enter group description"
                        rows={4}
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                        disabled={creatingGroup}
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleCreateGroup}
                        disabled={creatingGroup || !newGroupName.trim()}
                        className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {creatingGroup ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Create Group</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateGroupModal(false);
                          setNewGroupName("");
                          setNewGroupDescription("");
                        }}
                        disabled={creatingGroup}
                        className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
          )}

          {activeTab === "analytics" && (
            <div>
              {analytics ? (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl p-6 text-white">
                      <p className="text-sm opacity-90">Total Users</p>
                      <p className="text-3xl font-bold">
                        {analytics.overview.totalUsers}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-neutral-700 rounded-xl p-6">
                      <p className="text-sm text-neutral-500">Total Courses</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {analytics.overview.totalCourses}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-neutral-700 rounded-xl p-6">
                      <p className="text-sm text-neutral-500">Total Groups</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {analytics.overview.totalGroups}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-neutral-700 rounded-xl p-6">
                      <p className="text-sm text-neutral-500">Active Users (30d)</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {analytics.overview.activeUsers}
                      </p>
                    </div>
                  </div>

                  {/* Average Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                      <p className="text-sm text-neutral-500">Average Score</p>
                      <p className="text-2xl font-bold text-primary-500">
                        {analytics.overview.averageScore.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                      <p className="text-sm text-neutral-500">Avg Commits</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {analytics.overview.averageCommits.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                      <p className="text-sm text-neutral-500">Avg PRs</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {analytics.overview.averagePRs.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                      <p className="text-sm text-neutral-500">Avg Contributions</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {analytics.overview.averageContributions.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Top Users */}
                  {analytics.topUsers && analytics.topUsers.length > 0 && (
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                        Top 10 Users by Score
                      </h3>
                      <div className="space-y-2">
                        {analytics.topUsers?.map((user, index) => (
                          <div
                            key={user.id}
                            className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                            onClick={() => router.push(`/admin/users/${user.userId || user.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="w-8 text-center font-bold text-neutral-500">
                                  #{index + 1}
                                </span>
                                {user.user.avatar && (
                                  <img
                                    src={user.user.avatar}
                                    alt={user.user.userName}
                                    className="w-8 h-8 rounded-full"
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {user.user.name}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    @{user.user.userName}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary-500">
                                  {user.finalScore.toLocaleString()}
                                </p>
                                <p className="text-xs text-neutral-500">Score</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Courses by Status */}
                  {analytics.coursesByStatus && (
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
                      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                        Courses by Status
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {analytics.coursesByStatus && Object.entries(analytics.coursesByStatus || {}).map(
                          ([status, count]: [string, number]) => (
                            <div
                              key={status}
                              className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                            >
                              <p className="text-sm text-neutral-500 capitalize">
                                {status}
                              </p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {count}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  Loading analytics...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

