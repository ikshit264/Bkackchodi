"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Settings, Save, Trash2, ArrowLeft, Users, Lock, Globe, AlertTriangle, UserCog } from "lucide-react";
import Loading from "../../../(root)/loading";

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showTransferOwnership, setShowTransferOwnership] = useState(false);
  const [transferQuery, setTransferQuery] = useState("");
  const [transferSearchResults, setTransferSearchResults] = useState<any[]>([]);
  const [transferring, setTransferring] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchGroup = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/groups/${groupId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch group");
        }

        const data = await response.json();
        const groupData = data.data;

        // Check permissions
        setIsOwner(groupData.__meta?.isOwner || false);
        setIsAdmin(groupData.__meta?.isAdmin || false);

        // Only owner/admin can access settings
        if (!groupData.__meta?.isOwner && !groupData.__meta?.isAdmin && !groupData.__meta?.isGroupAdmin) {
          router.push(`/groups/${groupId}`);
          return;
        }

        setGroup(groupData);
        setName(groupData.name || "");
        setDescription(groupData.description || "");
        setIcon(groupData.icon || "");
        setIsPrivate(groupData.isPrivate || false);
        setMembers(groupData.members || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load group");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, isLoaded, user, router]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const wasPrivate = group.isPrivate;
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon: icon.trim() || null,
          isPrivate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update group");
      }

      const data = await response.json();
      setGroup(data.data);

      // If privacy changed, notify members
      if (wasPrivate !== isPrivate) {
        // Notification will be sent by backend
        alert(
          `Group is now ${isPrivate ? "private" : "public"}. All members have been notified.`
        );
      }

      // Redirect back to group page
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleTransferOwnershipSearch = async () => {
    if (!transferQuery.trim()) {
      setTransferSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(transferQuery)}`);
      if (!response.ok) return;
      const data = await response.json();
      // Filter to only show current members
      const memberIds = new Set(members.map((m: any) => m.userId));
      setTransferSearchResults(
        (data.data || []).filter((u: any) => memberIds.has(u.id) && u.id !== group?.ownerId)
      );
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!confirm("Are you sure you want to transfer ownership? You will become an admin.")) {
      return;
    }

    setTransferring(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}/transfer-ownership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newOwnerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to transfer ownership");
      }

      alert("Ownership transferred successfully!");
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== group.name) {
      setError("Group name doesn't match");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete group");
      }

      alert("Group deleted successfully");
      router.push("/groups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!group) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Group not found or you don't have permission to access settings.</p>
      </div>
    );
  }

  // Category groups (sectors) can't be edited by non-admins
  if (group.type === "CATEGORY" && !isAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Only admins can edit category groups.</p>
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg"
        >
          Back to Group
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/groups/${groupId}`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary-500" />
            <h1 className="text-3xl font-bold">Group Settings</h1>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Basic Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6"
        >
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Group Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Enter group name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Enter group description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Icon (emoji or URL)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="🌐 or https://..."
              />
            </div>
          </div>
        </motion.div>

        {/* Privacy Settings */}
        {group.type === "CUSTOM" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              {isPrivate ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
              Privacy Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Group Visibility</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {isPrivate
                      ? "Only members can see and join this group"
                      : "Anyone can see and join this group"}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {isPrivate !== group.isPrivate && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    Changing privacy will notify all current members. Existing members will remain in the group.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Transfer Ownership */}
        {isOwner && group.type === "CUSTOM" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Transfer Ownership
            </h2>

            {!showTransferOwnership ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Transfer ownership of this group to another member. You will become an admin.
                </p>
                <button
                  onClick={() => setShowTransferOwnership(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                >
                  <UserCog className="w-4 h-4" />
                  Transfer Ownership
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search Members</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={transferQuery}
                      onChange={(e) => setTransferQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleTransferOwnershipSearch()}
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Search by username or email"
                    />
                    <button
                      onClick={handleTransferOwnershipSearch}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {transferSearchResults.length > 0 && (
                  <div className="border rounded-lg p-4 max-h-64 overflow-auto">
                    <div className="space-y-2">
                      {transferSearchResults.map((user: any) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                        >
                          <div>
                            <div className="font-medium">{user.userName || user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                          <button
                            onClick={() => handleTransferOwnership(user.id)}
                            disabled={transferring}
                            className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                          >
                            {transferring ? "Transferring..." : "Transfer"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowTransferOwnership(false);
                    setTransferQuery("");
                    setTransferSearchResults([]);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Danger Zone - Delete Group */}
        {isOwner && group.type === "CUSTOM" && (
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
                  Once you delete a group, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Group
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type <span className="font-bold">{group.name}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder={group.name}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirmText !== group.name || saving}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Deleting..." : "Delete Group"}
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
        )}
      </div>
    </div>
  );
}


