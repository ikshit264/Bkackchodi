"use client";
import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import GroupLeaderboard from "../../../components/group/GroupLeaderboard";
import GroupAnalytics from "../../../components/group/GroupAnalytics";

type Tab = "overview" | "leaderboard" | "analytics" | "activity";

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [managingMember, setManagingMember] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`, { cache: "no-store" });
        const json = await res.json();
        setGroup(json.data);
        setMeId(json.data?.__meta?.meId || null);
        // load invites for left panel/status checks
        const r2 = await fetch(`/api/groups/${groupId}/invites`, { cache: "no-store" });
        if (r2.ok) {
          const j2 = await r2.json();
          setInvites(j2.data || []);
          if (!meId) setMeId(j2.meId || null);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  useEffect(() => {
    if (activeTab === "activity") {
      const loadActivities = async () => {
        setActivitiesLoading(true);
        try {
          const res = await fetch(`/api/groups/${groupId}/activity?page=${activityPage}&limit=20`, { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            setActivities(json.data || []);
          }
        } finally {
          setActivitiesLoading(false);
        }
      };
      loadActivities();
    }
  }, [groupId, activeTab, activityPage]);

  const members = useMemo(() => group?.members || [], [group]);
  const ownerId = useMemo(() => group?.ownerId || null, [group]);
  const isOwner = useMemo(() => Boolean(group?.__meta?.isOwner), [group]);
  const membersByUserId = useMemo(() => {
    const map: Record<string, any> = {};
    for (const m of members) map[m.userId] = m;
    return map;
  }, [members]);
  const invitesByToUser: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const inv of invites) {
      const uid = inv.toUserId;
      if (!map[uid]) map[uid] = [];
      map[uid].push(inv);
    }
    return map;
  }, [invites]);

  const doSearch = async () => {
    if (!query.trim()) return setSearchResults([]);
    const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
    const json = await res.json();
    setSearchResults(json.data || []);
  };

  const inviteUser = async (user: any) => {
    setInviting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: user.userName || user.email })
      });
      if (res.ok) {
        const data = await res.json();
        alert("Invite sent successfully!");
        // refresh invites list
        const r2 = await fetch(`/api/groups/${groupId}/invites`, { cache: "no-store" });
        if (r2.ok) {
          const j2 = await r2.json();
          setInvites(j2.data || []);
        }
        setQuery("");
        setSearchResults([]);
      } else {
        const j = await res.json();
        alert(j.error || j.details || "Failed to invite user");
      }
    } finally {
      setInviting(false);
    }
  };

  const handleManageMember = async (memberUserId: string, action: "promote" | "demote" | "remove", role?: string) => {
    if (action === "remove" && !confirm("Are you sure you want to remove this member?")) {
      return;
    }

    setManagingMember(memberUserId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, role }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || (action === "remove" ? "Member removed successfully" : action === "promote" ? "Member promoted successfully" : "Member demoted successfully"));
        // Refresh group data
        const r = await fetch(`/api/groups/${groupId}`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setGroup(j.data);
        }
      } else {
        const j = await res.json();
        alert(j.error || j.details || "Failed to manage member");
      }
    } finally {
      setManagingMember(null);
    }
  };

  const renderActionForUser = (u: any) => {
    // self-protection
    if (ownerId && u.id === ownerId) {
      return <span className="text-xs font-semibold">Owner</span>;
    }
    if (meId && u.id === meId) {
      return <span className="text-xs opacity-70">You</span>;
    }
    if (membersByUserId[u.id]) {
      return <span className="text-xs opacity-70">Already added</span>;
    }
    const invs = invitesByToUser[u.id] || [];
    const accepted = invs.find((it:any)=> it.status === "ACCEPTED");
    if (accepted) return <span className="text-xs text-green-700">Accepted</span>;
    const pendingFromMe = invs.find((it:any)=> it.status === "PENDING" && it.fromUserId === meId);
    if (pendingFromMe) return <span className="text-xs">Requested</span>;
    if (!isOwner) return <span className="text-xs opacity-70">No access</span>;
    return (
      <button disabled={inviting} onClick={()=>inviteUser(u)} className="bg-blue-600 text-white px-3 py-1 rounded disabled:bg-blue-300">Invite</button>
    );
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!group) return <div className="p-6">Not found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {group.icon && <span className="text-4xl">{group.icon}</span>}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{group.name}</h1>
              {group.type === "CATEGORY" && (
                <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 rounded">
                  CATEGORY
                </span>
              )}
              {group.type === "CUSTOM" && (
                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                  CUSTOM
                </span>
              )}
            </div>
            {group.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {group.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {group.isPrivate && (
                <span className="text-xs opacity-70">Private</span>
              )}
              {!group.isPrivate && (
                <span className="text-xs opacity-70">Public</span>
              )}
            </div>
          </div>
        </div>
        {(group.__meta?.isOwner || group.__meta?.isAdmin) && (
          <div className="flex gap-2">
            <Link
              href={`/admin/groups/${groupId}`}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Edit
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-300">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "leaderboard"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "analytics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "activity"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Activity
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Members ({members.length})</h2>
            <ul className="space-y-2">
              {members.map((m:any) => {
                const isTargetOwner = ownerId === m.userId;
                const isMe = meId === m.userId;
                const canManage = (isOwner || group?.__meta?.isGroupAdmin) && !isTargetOwner && !isMe;
                
                return (
                  <li key={m.userId} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 flex-1">
                      {m.user?.avatar ? (
                        <img src={m.user.avatar} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                          {(m.user?.userName || m.user?.email || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.user?.userName || m.user?.email || m.userId}</span>
                          {isMe && <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">You</span>}
                          {isTargetOwner && <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">Owner</span>}
                          {m.role === "ADMIN" && !isTargetOwner && <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">Admin</span>}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{m.user?.email}</span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        {m.role === "MEMBER" && (
                          <button
                            onClick={() => handleManageMember(m.userId, "promote", "ADMIN")}
                            disabled={managingMember === m.userId}
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            title="Promote to Admin"
                          >
                            ↑
                          </button>
                        )}
                        {m.role === "ADMIN" && (
                          <button
                            onClick={() => handleManageMember(m.userId, "demote", "MEMBER")}
                            disabled={managingMember === m.userId}
                            className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                            title="Demote to Member"
                          >
                            ↓
                          </button>
                        )}
                        <button
                          onClick={() => handleManageMember(m.userId, "remove")}
                          disabled={managingMember === m.userId}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                          title="Remove Member"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Requests & statuses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-1">Requested</div>
                <ul className="space-y-1 max-h-40 overflow-auto">
                  {invites.filter((iv:any)=> iv.status === "PENDING" && iv.fromUserId === meId).map((iv:any)=> (
                    <li key={iv.id} className="text-sm">{iv.toUser?.userName || iv.toUser?.email}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Accepted</div>
                <ul className="space-y-1 max-h-40 overflow-auto">
                  {invites.filter((iv:any)=> iv.status === "ACCEPTED" && iv.fromUserId === meId).map((iv:any)=> (
                    <li key={iv.id} className="text-sm">{iv.toUser?.userName || iv.toUser?.email}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Rejected</div>
                <ul className="space-y-1 max-h-40 overflow-auto">
                  {invites.filter((iv:any)=> iv.status === "REJECTED" && iv.fromUserId === meId).map((iv:any)=> (
                    <li key={iv.id} className="text-sm">{iv.toUser?.userName || iv.toUser?.email}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Expired</div>
                <ul className="space-y-1 max-h-40 overflow-auto">
                  {invites.filter((iv:any)=> iv.status === "EXPIRED" && iv.fromUserId === meId).map((iv:any)=> (
                    <li key={iv.id} className="text-sm">{iv.toUser?.userName || iv.toUser?.email}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Invite Members</h2>
          <div className="flex gap-2 mb-3">
            <input className="border rounded p-2 flex-1" placeholder="Search by userName or email" value={query} onChange={(e)=>setQuery(e.target.value)} />
            <button onClick={doSearch} className="bg-gray-200 px-3 rounded">Search</button>
          </div>
          <ul className="space-y-2 max-h-64 overflow-auto">
            {searchResults.map((u)=> (
              <li key={u.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.userName || u.name}</div>
                  <div className="text-xs opacity-70">{u.email}</div>
                </div>
                {renderActionForUser(u)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      )}

      {activeTab === "leaderboard" && <GroupLeaderboard groupId={groupId} />}

      {activeTab === "analytics" && <GroupAnalytics groupId={groupId} />}

      {activeTab === "activity" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Recent Activity</h2>
          {activitiesLoading ? (
            <div className="text-center py-8">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity: any) => {
                const getActivityMessage = () => {
                  switch (activity.type) {
                    case "GROUP_MEMBER_JOINED":
                      return `${activity.user?.userName || activity.user?.name || "Someone"} joined the group`;
                    case "COURSE_CREATED":
                      return `${activity.user?.userName || activity.user?.name || "Someone"} created course "${activity.data?.courseTitle}"`;
                    case "GROUP_MEMBER_PROMOTED":
                      return `${activity.user?.userName || activity.user?.name || "Someone"} was promoted to ${activity.data?.newRole || "admin"}`;
                    case "GROUP_MEMBER_DEMOTED":
                      return `${activity.user?.userName || activity.user?.name || "Someone"} was demoted to ${activity.data?.newRole || "member"}`;
                    case "GROUP_MEMBER_REMOVED":
                      return `${activity.user?.userName || activity.user?.name || "Someone"} was removed from the group`;
                    case "GROUP_PRIVACY_CHANGED":
                      return `Group privacy changed to ${activity.data?.newPrivacy || "private"}`;
                    case "GROUP_OWNERSHIP_TRANSFERRED":
                      return `Ownership transferred to ${activity.data?.newOwnerName || "someone"}`;
                    default:
                      return "Activity occurred";
                  }
                };

                return (
                  <div key={activity.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-start gap-3">
                      {activity.user?.avatar ? (
                        <img src={activity.user.avatar} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                          {(activity.user?.userName || activity.user?.name || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm">{getActivityMessage()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


