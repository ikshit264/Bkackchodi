"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Settings, Save, Trash2, ArrowLeft, AlertTriangle, Users } from "lucide-react";
import Loading from "../../../(root)/loading";

export default function CourseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const courseId = params.courseId as string;

  interface CourseInfo {
    id: string;
    title: string;
    status: string;
    userId: string;
    groupId?: string | null;
    createdAt?: string;
  }
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Form state
  const [groupId, setGroupId] = useState<string>("");
  const [groups, setGroups] = useState<Array<{id: string; name: string}>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch course
        const courseRes = await fetch(`/api/courses/${courseId}`);
        if (!courseRes.ok) {
          throw new Error("Failed to fetch course");
        }
        const courseData = await courseRes.json();
        const courseInfo = courseData.data;

        // Check if user is owner
        const dbUserRes = await fetch(`/api/user/profile`);
        if (dbUserRes.ok) {
          const dbUserData = await dbUserRes.json();
          setIsOwner(dbUserData.user?.id === courseInfo.userId);
        }

        if (!isOwner) {
          router.push(`/courses/${courseId}`);
          return;
        }

        setCourse(courseInfo);
        setGroupId(courseInfo.groupId || "");

        // Fetch user's groups
        const groupsRes = await fetch("/api/groups/my");
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const allGroups = groupsData.data || [];
          // Get all groups (both CUSTOM and CATEGORY)
          setGroups(allGroups);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, isLoaded, user, router, isOwner]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: groupId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update course");
      }

      alert("Course settings updated successfully!");
      router.push(`/courses/${courseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== course.title) {
      setError("Course name doesn't match");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirm: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete course");
      }

      alert("Course deleted successfully");
      router.push(`/${user?.username || user?.id}/c`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete course");
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!course) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Course not found or you don&apos;t have permission to access settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/courses/${courseId}`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary-500" />
            <h1 className="text-3xl font-bold">Course Settings</h1>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Course Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6"
        >
          <h2 className="text-xl font-bold mb-4">Course Information</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Title:</span>
              <p className="text-lg font-semibold">{course.title}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
              <p className="text-lg">{course.status}</p>
            </div>
          </div>
        </motion.div>

        {/* Group Assignment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Group Assignment
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Group (Optional)</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">None (will use Global group)</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Change the group this course belongs to</p>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Danger Zone - Delete Course */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-red-500 p-6"
        >
          <h2 className="text-xl font-bold mb-4 text-red-600">Danger Zone</h2>

          {!showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Once you delete a course, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Course
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  This action cannot be undone. This will permanently delete the course, all batches, and all projects.
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Type <span className="font-bold">{course.title}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder={course.title}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== course.title || saving}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Deleting..." : "Delete Course"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}


