"use client";
import { useEffect, useMemo, useState } from "react";

type Invite = {
  id: string;
  toUser: { id: string; userName: string | null; name: string | null; email: string | null; avatar: string | null };
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED";
  access: "READ_ONLY" | "COPY";
  expiresAt: string | null;
  createdAt: string;
};

type Access = { userId: string; access: 'READ_ONLY' };
type AccessWithUser = { userId: string; access: 'READ_ONLY' | 'COPY'; user: { id: string; userName: string | null; email: string | null; name: string | null; avatar: string | null } };

export default function CourseShare({ courseId }: { courseId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState<string | null>(null);
  const [loadingUpdate, setLoadingUpdate] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [accessesWithUsers, setAccessesWithUsers] = useState<AccessWithUser[]>([]);
  const [access, setAccess] = useState<"READ_ONLY" | "COPY">("READ_ONLY");

  const fetchInvites = async () => {
    const res = await fetch(`/api/courses/${courseId}/invites`, { cache: "no-store" });
    const json = await res.json();
    const payload = json.data || {};
    setInvites(payload.invites || []);
    setAccesses(payload.accesses || []);
    setAccessesWithUsers(payload.accessesWithUsers || []);
  };

  useEffect(() => { fetchInvites(); }, [courseId]);

  const onSearch = async () => {
    if (!query.trim()) { 
      setResults([]); 
      return; 
    }
    if (query.trim().length < 2) {
      alert("Please enter at least 2 characters to search");
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(query.trim())}&limit=10`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data || []);
      } else {
        alert(json.error || "Search failed");
        setResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Failed to search users. Please try again.");
      setResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  const getLatestInvite = (userId: string): Invite | undefined => {
    const list = invites.filter(i => i.toUser?.id === userId);
    if (list.length === 0) return undefined;
    return list.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };

  const hasAccess = (userId: string) => accesses.some(a => a.userId === userId);

  const canInviteUser = (userId: string) => {
    // Do not invite if already has access
    if (hasAccess(userId)) return false;
    const existing = getLatestInvite(userId);
    if (!existing) return true;
    if (existing.status === "ACCEPTED") return false; // already in course
    if (existing.status === "PENDING") {
      // still pending and not expired => requested
      if (!existing.expiresAt) return false;
      return new Date(existing.expiresAt).getTime() < Date.now();
    }
    if (existing.status === "REJECTED" || existing.status === "EXPIRED" || existing.status === "CANCELLED") return true;
    return true;
  };

  const statusBadge = (inv?: Invite, userId?: string) => {
    if (userId && hasAccess(userId)) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Accepted</span>;
    }
    if (!inv) return null;
    const common = "px-2 py-0.5 text-xs rounded-full";
    if (inv.status === "PENDING") return <span className={`${common} bg-yellow-100 text-yellow-700`}>Request sent</span>;
    if (inv.status === "ACCEPTED") return <span className={`${common} bg-green-100 text-green-700`}>Accepted</span>;
    if (inv.status === "REJECTED") return <span className={`${common} bg-red-100 text-red-700`}>Rejected</span>;
    if (inv.status === "EXPIRED") return <span className={`${common} bg-gray-200 text-gray-700`}>Expired</span>;
    if (inv.status === "CANCELLED") return <span className={`${common} bg-neutral-100 text-neutral-700`}>Cancelled</span>;
    return null;
  };

  const sendInvite = async (user: any) => {
    setLoadingInvite(user.id);
    try {
      const res = await fetch(`/api/courses/${courseId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserQuery: user.userName || user.email, access }),
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        alert(json.error || "Invite failed");
      } else {
        // Refresh invites and clear search results for this user
        await fetchInvites();
        // Remove the user from search results since invite was sent
        setResults(results.filter((u: any) => u.id !== user.id));
        // Show success message
        const accessLabel = access === "READ_ONLY" ? "Read Only" : "Copy";
        alert(`Invite sent successfully with ${accessLabel} access!`);
      }
    } finally {
      setLoadingInvite(null);
    }
  };

  const updateAccess = async (targetUserId: string, newAccess: 'READ_ONLY'|'COPY') => {
    setLoadingUpdate(targetUserId);
    try {
      const res = await fetch(`/api/courses/${courseId}/access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, newAccess }),
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        alert(json.error || "Failed to send role change request");
      } else {
        alert("Role change requested. The user must accept to apply changes.");
      }
      await fetchInvites();
    } finally {
      setLoadingUpdate(null);
    }
  };

  const checkChallenges = async (targetUserId: string): Promise<{ hasChallenges: boolean; challengeNames: string[] }> => {
    try {
      const res = await fetch(`/api/courses/${courseId}/access/check-challenges?userId=${targetUserId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        return {
          hasChallenges: json.hasChallenges || false,
          challengeNames: json.challengeNames || [],
        };
      }
      return { hasChallenges: false, challengeNames: [] };
    } catch (error) {
      console.error("Error checking challenges:", error);
      return { hasChallenges: false, challengeNames: [] };
    }
  };

  const removeAccess = async (targetUserId: string) => {
    // Check if user has challenges
    const { hasChallenges, challengeNames } = await checkChallenges(targetUserId);
    
    let confirmMessage = "Are you sure you want to remove this user's access?";
    if (hasChallenges) {
      const challengeList = challengeNames.length > 0 
        ? challengeNames.join(", ")
        : "challenge(s)";
      confirmMessage = `This user is also in challenge(s) for this course: ${challengeList}. Removing access will also remove them from the challenge(s) and delete their cloned course. Are you sure you want to proceed?`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    setLoadingUpdate(targetUserId);
    try {
      const res = await fetch(`/api/courses/${courseId}/access?userId=${targetUserId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        alert(json.error || "Failed to remove access");
      } else {
        if (json.challengesRemoved > 0) {
          alert(`Access removed successfully. User was also removed from ${json.challengesRemoved} challenge(s).`);
        } else {
          alert("Access removed successfully");
        }
      }
      await fetchInvites();
    } finally {
      setLoadingUpdate(null);
    }
  };

  const resultRows = useMemo(() => {
    return results.map((u) => {
      const inv = getLatestInvite(u.id);
      const disabled = !canInviteUser(u.id);
      return (
        <li key={u.id} className="flex items-center justify-between">
          <div>
            <div className="font-medium">{u.userName || u.name}</div>
            <div className="text-xs opacity-70">{u.email}</div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(inv, u.id)}
            <button disabled={disabled || loadingInvite === u.id} onClick={()=>sendInvite(u)} className="px-3 py-1 rounded bg-blue-600 text-white disabled:bg-blue-300">
              {loadingInvite === u.id ? "Sending..." : disabled ? "Unavailable" : "Invite"}
            </button>
          </div>
        </li>
      );
    })
  }, [results, invites, loadingInvite, access]);

  return (
    <div className="border rounded-lg p-4 w-full max-w-2xl">
      <h3 className="font-semibold mb-2">Share Course</h3>
      <div className="flex items-center gap-2 mb-3">
        <input 
          className="border rounded p-2 flex-1" 
          placeholder="Search by userName or email" 
          value={query} 
          onChange={(e)=>setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loadingSearch}
        />
        <select className="border rounded p-2" value={access} onChange={(e)=>setAccess(e.target.value as any)}>
          <option value="READ_ONLY">Read Only (can only view)</option>
          <option value="COPY">Copy (will get their own copy)</option>
        </select>
        <button 
          onClick={onSearch} 
          disabled={loadingSearch || !query.trim() || query.trim().length < 2}
          className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {loadingSearch ? "Searching..." : "Search"}
        </button>
      </div>

      {loadingSearch && (
        <div className="text-center py-4 text-gray-500">Searching...</div>
      )}
      {!loadingSearch && results.length === 0 && query.trim().length >= 2 && (
        <div className="text-center py-4 text-gray-500">No users found. Try a different search term.</div>
      )}
      {!loadingSearch && results.length > 0 && (
        <ul className="space-y-2">
          {resultRows}
        </ul>
      )}

      <div className="mt-6">
        <h4 className="font-medium mb-2">Current Access</h4>
        {accessesWithUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No users with access yet</p>
        ) : (
          <ul className="space-y-2">
            {accessesWithUsers.map((acc) => (
              <li key={acc.userId} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{acc.user?.userName || acc.user?.name || acc.user?.email}</div>
                  <div className="text-xs opacity-70">{acc.user?.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={acc.access}
                    onChange={(e) => {
                      const next = e.target.value as any;
                      if (next === acc.access) return;
                      const roleName = next === 'READ_ONLY' ? 'Read Only' : 'Copy';
                      const ok = confirm(`Change role for ${acc.user?.userName || acc.user?.email || 'user'} to ${roleName}? The user must accept to apply changes.`);
                      if (ok) updateAccess(acc.userId, next);
                    }}
                    disabled={loadingUpdate === acc.userId}
                    className="border rounded px-2 py-1 text-sm disabled:opacity-50"
                  >
                    <option value="READ_ONLY">Read Only</option>
                    <option value="COPY">Copy</option>
                  </select>
                  <button
                    onClick={() => removeAccess(acc.userId)}
                    disabled={loadingUpdate === acc.userId}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300"
                  >
                    {loadingUpdate === acc.userId ? "..." : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Invites removed by request */}
    </div>
  );
}


