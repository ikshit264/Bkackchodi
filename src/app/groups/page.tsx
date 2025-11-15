"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Building2, Users, Plus, Edit, Tag, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Loading from "../(root)/loading";

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: string;
  icon: string | null;
  isPrivate: boolean;
  _count?: {
    members: number;
    courses: number;
  };
  __meta?: {
    isOwner?: boolean;
    isAdmin?: boolean;
  };
}

export default function MyGroupsPage() {
  const { isLoaded } = useUser();
  const [customGroups, setCustomGroups] = useState<Group[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<Group[]>([]);
  const [allCategoryGroups, setAllCategoryGroups] = useState<Group[]>([]);
  const [otherGroups, setOtherGroups] = useState<Group[]>([]); // Groups user is not part of
  const [otherGroupsLoading, setOtherGroupsLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState<Record<string, boolean>>({});
  const [initialLoading, setInitialLoading] = useState(true); // Only for first load
  const [searchLoading, setSearchLoading] = useState(false); // For search/filter changes
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "CUSTOM" | "CATEGORY">("ALL");
  const [privacyFilter, setPrivacyFilter] = useState<"ALL" | "PUBLIC" | "PRIVATE">("ALL");
  const [sortBy, setSortBy] = useState<"created" | "name" | "members">("created");
  const [currentPage, setCurrentPage] = useState(1);
  interface Pagination {
    page: number;
    totalPages: number;
    totalCount: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  }
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load groups user is not part of
  const loadOtherGroups = async () => {
    try {
      setOtherGroupsLoading(true);
      // Get all public groups
      const res = await fetch("/api/groups?isPrivate=false&includeCounts=true&limit=50", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const allPublicGroups = json.data || [];
        
        // Get user's group IDs
        const myGroupsRes = await fetch("/api/groups/my?limit=100", { cache: "no-store" });
        const myGroupsJson = await myGroupsRes.json();
        const myGroupIds = new Set((myGroupsJson.data || []).map((g: Group) => g.id));
        
        // Filter out groups user is already part of
        const otherGroupsList = allPublicGroups.filter((g: Group) => !myGroupIds.has(g.id));
        setOtherGroups(otherGroupsList);
      }
    } catch (err) {
      console.error("Error loading other groups:", err);
    } finally {
      setOtherGroupsLoading(false);
    }
  };

  // Initial load - check admin status
  useEffect(() => {
    if (!isLoaded) return;
    const checkAdmin = async () => {
      try {
        const adminRes = await fetch("/api/admin/check");
        const adminData = await adminRes.json();
        setIsAdmin(adminData.isAdmin || false);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [isLoaded]);

  // Load groups when filters change
  useEffect(() => {
    if (!isLoaded) return;
    const load = async () => {
      try {
        // Use searchLoading for subsequent loads, initialLoading only for first load
        if (initialLoading) {
          setInitialLoading(true);
        } else {
          setSearchLoading(true);
        }
        
        // Build query params - always include search (even if empty) to show all filtered groups
        const params = new URLSearchParams();
        if (debouncedSearchQuery.trim()) {
          params.set("search", debouncedSearchQuery.trim());
        }
        if (typeFilter !== "ALL") params.set("type", typeFilter);
        if (privacyFilter === "PUBLIC") params.set("isPrivate", "false");
        if (privacyFilter === "PRIVATE") params.set("isPrivate", "true");
        params.set("sort", sortBy);
        params.set("page", currentPage.toString());
        params.set("limit", "20");

        // Fetch user's groups
        const res = await fetch(`/api/groups/my?${params.toString()}`, { cache: "no-store" });
        const json = await res.json();
        const allGroups = json.data || [];
        setPagination(json.pagination || null);
        
        // Separate by type
        setCustomGroups(allGroups.filter((g: Group) => g.type === "CUSTOM" || !g.type));
        setCategoryGroups(allGroups.filter((g: Group) => g.type === "CATEGORY"));

        // Fetch all category groups (for admin)
        if (isAdmin) {
          const allCategoriesRes = await fetch("/api/groups?type=CATEGORY&includeCounts=true&all=true");
          if (allCategoriesRes.ok) {
            const allCategoriesData = await allCategoriesRes.json();
            setAllCategoryGroups(allCategoriesData.data || []);
          }
        }

        // Fetch other groups (groups user is not part of)
        loadOtherGroups();
      } finally {
        setInitialLoading(false);
        setSearchLoading(false);
      }
    };
    load();
  }, [isLoaded, isAdmin, debouncedSearchQuery, typeFilter, privacyFilter, sortBy, currentPage, initialLoading]);

  // Join a group
  const handleJoinGroup = async (groupId: string) => {
    setJoinLoading((prev) => ({ ...prev, [groupId]: true }));
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        alert("Successfully joined the group!");
        // Reload groups
        loadOtherGroups();
        // Also refresh my groups
        const params = new URLSearchParams();
        if (debouncedSearchQuery.trim()) params.set("search", debouncedSearchQuery.trim());
        if (typeFilter !== "ALL") params.set("type", typeFilter);
        if (privacyFilter === "PUBLIC") params.set("isPrivate", "false");
        if (privacyFilter === "PRIVATE") params.set("isPrivate", "true");
        params.set("sort", sortBy);
        params.set("page", currentPage.toString());
        params.set("limit", "20");
        const myRes = await fetch(`/api/groups/my?${params.toString()}`, { cache: "no-store" });
        if (myRes.ok) {
          const myJson = await myRes.json();
          const allGroups = myJson.data || [];
          setCustomGroups(allGroups.filter((g: Group) => g.type === "CUSTOM" || !g.type));
          setCategoryGroups(allGroups.filter((g: Group) => g.type === "CATEGORY"));
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to join group");
      }
    } catch (err) {
      console.error("Failed to join group:", err);
      alert("Failed to join group. Please try again.");
    } finally {
      setJoinLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const createGroup = async () => {
    if (!name.trim()) {
      alert("Group name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, type: "CUSTOM" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomGroups((prev) => [data.data, ...prev]);
        setName("");
        setDescription("");
        alert("Group created successfully!");
      } else {
        const error = await res.json();
        alert(error.error || error.details || "Failed to create group");
      }
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const createCategoryGroup = async () => {
    if (!categoryName.trim()) {
      alert("Category name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription,
          type: "CATEGORY",
          icon: categoryIcon || null,
          isPrivate: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAllCategoryGroups((prev) => [data.data, ...prev]);
        setCategoryName("");
        setCategoryDescription("");
        setCategoryIcon("");
        setShowCreateCategory(false);
        alert("Category group created successfully!");
      } else {
        const error = await res.json();
        alert(error.error || error.details || "Failed to create category group");
      }
    } catch (err) {
      console.error("Failed to create category group:", err);
      alert("Failed to create category group. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // Only show full page loading on initial load
  if (initialLoading && customGroups.length === 0 && categoryGroups.length === 0) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="w-8 h-8 text-primary-500" />
              Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your groups and categories
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    // Prevent form submission on Enter
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  placeholder="Search groups by name or description..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                {searchQuery && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSearchQuery("");
                      setDebouncedSearchQuery("");
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none"
                    type="button"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              {debouncedSearchQuery && debouncedSearchQuery !== searchQuery && (
                <p className="text-xs text-gray-500 mt-1">Searching...</p>
              )}
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as "ALL" | "CUSTOM" | "CATEGORY");
                  setCurrentPage(1); // Reset to first page when filter changes
                }}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Types</option>
                <option value="CUSTOM">Custom</option>
                <option value="CATEGORY">Category</option>
              </select>

              {/* Privacy Filter */}
              <select
                value={privacyFilter}
                onChange={(e) => {
                  setPrivacyFilter(e.target.value as "ALL" | "PUBLIC" | "PRIVATE");
                  setCurrentPage(1); // Reset to first page when filter changes
                }}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Privacy</option>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as "created" | "name" | "members");
                  setCurrentPage(1); // Reset to first page when sort changes
                }}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="created">Newest</option>
                <option value="name">Name</option>
                <option value="members">Members</option>
              </select>
            </div>
          </div>
        </div>

        {/* Admin: Create Category Group */}
        {isAdmin && (
          <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Admin: Manage Category Groups</h2>
              <button
                onClick={() => setShowCreateCategory(!showCreateCategory)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {showCreateCategory ? "Cancel" : "Create Category"}
              </button>
            </div>

            {showCreateCategory && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-1">Category Name *</label>
                  <input
                    className="w-full border rounded p-2"
                    placeholder="e.g., Web Development"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    className="w-full border rounded p-2"
                    placeholder="Category description"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Icon (emoji or URL)</label>
                  <input
                    className="w-full border rounded p-2"
                    placeholder="🌐 or https://..."
                    value={categoryIcon}
                    onChange={(e) => setCategoryIcon(e.target.value)}
                  />
                </div>
                <button
                  disabled={creating || !categoryName.trim()}
                  onClick={createCategoryGroup}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded disabled:bg-green-300"
                >
                  {creating ? "Creating..." : "Create Category Group"}
                </button>
              </div>
            )}

            {/* All Category Groups (Admin View) */}
            {allCategoryGroups.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">All Category Groups</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allCategoryGroups.map((g) => (
                    <div
                      key={g.id}
                      className="border rounded-lg p-4 bg-white dark:bg-gray-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{g.icon || "📁"}</span>
                          <div>
                            <div className="font-semibold">{g.name}</div>
                            <div className="text-xs text-gray-500">CATEGORY</div>
                          </div>
                        </div>
                        <Link
                          href={`/admin/groups/${g.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      </div>
                      {g.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {g.description}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{g._count?.members || 0} members</span>
                        <span>{g._count?.courses || 0} courses</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Custom Group */}
        <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6">
          <h2 className="text-xl font-bold mb-4">Create Custom Group</h2>
          <div className="space-y-3">
            <input
              className="w-full border rounded p-2"
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full border rounded p-2"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              disabled={creating}
              onClick={createGroup}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-blue-300 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>

        {/* My Custom Groups */}
        <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Custom Groups {pagination && `(${pagination.totalCount})`}
            {searchLoading && <span className="text-sm text-gray-500 animate-pulse">(Searching...)</span>}
          </h2>
          {searchLoading && customGroups.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading groups...</p>
              </div>
            </div>
          ) : customGroups.length === 0 ? (
            <p className="text-gray-500">
              {debouncedSearchQuery || typeFilter !== "ALL" || privacyFilter !== "ALL"
                ? "No groups found matching your filters. Try adjusting your search or filters."
                : "No custom groups yet. Create one above!"}
            </p>
          ) : (
            <>
              {searchLoading && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Updating results...</span>
                </div>
              )}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${searchLoading ? 'opacity-60' : ''}`}>
                {customGroups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}`}
                    className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold">{g.name}</div>
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                        CUSTOM
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {g.description || "No description"}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{g._count?.members || 0} members</span>
                      <span>{g._count?.courses || 0} courses</span>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage || searchLoading}
                    className="px-3 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={!pagination.hasNextPage || searchLoading}
                    className="px-3 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* My Category Groups */}
        {categoryGroups.length > 0 && (
          <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              My Category Groups ({categoryGroups.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryGroups.map((g) => (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{g.icon || "📁"}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{g.name}</div>
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 rounded">
                        CATEGORY
                      </span>
                    </div>
                  </div>
                  {g.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {g.description}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{g._count?.members || 0} members</span>
                    <span>{g._count?.courses || 0} courses</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Join Other Groups */}
        <div className="rounded-2xl shadow-[0_8px_0_0_rgba(0,0,0,0.1)] border-4 border-slate-800 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Join Other Groups
            {otherGroupsLoading && <span className="text-sm text-gray-500 animate-pulse">(Loading...)</span>}
          </h2>
          {otherGroupsLoading && otherGroups.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading groups...</p>
              </div>
            </div>
          ) : otherGroups.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No other groups available to join. You&apos;re already part of all public groups!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherGroups.map((g) => (
                <div
                  key={g.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{g.name}</h3>
                        {g.type === "CATEGORY" && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            CATEGORY
                          </span>
                        )}
                        {g.type === "CUSTOM" && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      {g.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {g.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{g._count?.members || 0} members</span>
                      <span>{g._count?.courses || 0} courses</span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/groups/${g.id}`}
                        className="px-3 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleJoinGroup(g.id)}
                        disabled={joinLoading[g.id]}
                        className="px-3 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {joinLoading[g.id] ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Joining...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            Join
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
