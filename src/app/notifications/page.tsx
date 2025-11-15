"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const router = useRouter();
  const { user } = useUser();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?status=all", { cache: "no-store" });
      const json = await res.json();
      const base = json.data || [];
      // Enrich invite notifications with current status
      const enriched = await Promise.all(
        base.map(async (n: any) => {
          try {
            if (n?.type === 'GROUP_INVITE' && n?.data?.inviteId) {
              const r = await fetch(`/api/groups/invites/${n.data.inviteId}`);
              const j = await r.json();
              return { ...n, inviteMeta: j.data };
            }
            if (n?.type === 'COURSE_INVITE' && n?.data?.inviteId) {
              const r = await fetch(`/api/courses/invites/${n.data.inviteId}`);
              const j = await r.json();
              return { ...n, inviteMeta: j.data };
            }
            if (n?.type === 'CHALLENGE_REQUEST' && n?.data?.requestId) {
              try {
                const r = await fetch(`/api/challenges/requests/${n.data.requestId}`);
                const j = await r.json();
                if (j.success) {
                  return { ...n, requestMeta: j.data };
                }
              } catch (error) {
                console.error("Error fetching challenge request:", error);
              }
            }
            if (n?.type === 'CHALLENGE_INVITE' && n?.data?.inviteId) {
              const r = await fetch(`/api/challenges/invites/${n.data.inviteId}`);
              const j = await r.json();
              return { ...n, inviteMeta: j.data };
            }
          } catch {}
          return n;
        })
      );
      setItems(enriched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  };

  // Quick actions for invites
  const handleGroupInviteAction = async (type: 'accept'|'reject', inviteId: string) => {
    setActionLoading({ ...actionLoading, [inviteId]: type });
    try {
      await fetch(`/api/groups/invites/${inviteId}/${type}`, { method: "POST" });
      await load();
    } finally {
      const newLoading = { ...actionLoading };
      delete newLoading[inviteId];
      setActionLoading(newLoading);
    }
  };
  const handleCourseInviteAction = async (type: 'accept'|'reject', inviteId: string) => {
    setActionLoading({ ...actionLoading, [inviteId]: type });
    try {
      await fetch(`/api/courses/invites/${inviteId}/${type}`, { method: "POST" });
      await load();
      if (type === 'accept') {
        // After accepting a course invite with COPY access, a replicated course is created.
        // Redirect user to their Courses tab to view it.
        const uname = user?.username;
        if (uname) {
          // small delay to allow backend to finish replication
          setTimeout(() => router.push(`/${uname}/c`), 500);
        }
      }
    } finally {
      const newLoading = { ...actionLoading };
      delete newLoading[inviteId];
      setActionLoading(newLoading);
    }
  };
  
  // Challenge request actions (for owners/admins)
  const handleChallengeRequestAction = async (type: 'approve'|'reject', requestId: string) => {
    if (type === 'reject' && !confirm("Are you sure you want to reject this challenge request?")) {
      return;
    }
    setActionLoading({ ...actionLoading, [requestId]: type });
    try {
      const res = await fetch(`/api/challenges/requests/${requestId}/${type}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (type === 'approve') {
          alert("Challenge request approved! Challenge created and invitations sent to group members. You have been automatically added as a participant.");
        } else {
          alert("Challenge request rejected.");
        }
        await load();
      } else {
        alert(data.error || `Failed to ${type} request`);
      }
    } catch (error) {
      console.error(`Error ${type}ing challenge request:`, error);
      alert(`Failed to ${type} request`);
    } finally {
      const newLoading = { ...actionLoading };
      delete newLoading[requestId];
      setActionLoading(newLoading);
    }
  };
  
  // Challenge invite actions (for members)
  const handleChallengeInviteAction = async (type: 'accept'|'reject', inviteId: string) => {
    setActionLoading({ ...actionLoading, [inviteId]: type });
    try {
      const res = await fetch(`/api/challenges/invites/${inviteId}/${type}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (type === 'accept') {
          alert("Challenge invitation accepted! You have been added to the challenge.");
          // Redirect to challenge page if challengeId is available
          if (data.data?.challengeId) {
            router.push(`/challenges/${data.data.challengeId}`);
            return;
          }
        } else {
          alert("Challenge invitation rejected.");
        }
        await load();
      } else {
        alert(data.error || `Failed to ${type} invitation`);
      }
    } catch (error) {
      console.error(`Error ${type}ing challenge invite:`, error);
      alert(`Failed to ${type} invitation`);
    } finally {
      const newLoading = { ...actionLoading };
      delete newLoading[inviteId];
      setActionLoading(newLoading);
    }
  };


  const grouped = (items || []).reduce((acc: Record<string, any[]>, n) => {
    const day = new Date(n.createdAt).toLocaleDateString();
    if (!acc[day]) acc[day] = [];
    acc[day].push(n);
    return acc;
  }, {});
  const days = Object.keys(grouped).sort((a,b)=> new Date(b).getTime() - new Date(a).getTime());

  const isLoadingAnyAction = Object.keys(actionLoading).length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto relative">
      {isLoadingAnyAction && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day}>
              <h2 className="text-sm font-semibold opacity-70 mb-2">{day}</h2>
              <ul className="space-y-2">
                {grouped[day]
                  .sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((n)=> (
                  <li key={n.id} className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="font-semibold">{n.type.replace(/_/g, ' ')}</div>
                        {/* Show formatted data for challenge requests */}
                        {(n.type === 'CHALLENGE_REQUEST' || n.type === 'CHALLENGE_REQUEST_APPROVED' || n.type === 'CHALLENGE_REQUEST_REJECTED') && n.data && (
                          <div className="text-sm text-gray-600">
                            <div><strong>Challenge:</strong> {n.data.challengeName || 'Untitled Challenge'}</div>
                            {n.type === 'CHALLENGE_REQUEST' && (
                              <>
                                <div><strong>Requester:</strong> {n.data.requesterName || 'Unknown'}</div>
                                <div><strong>Group:</strong> {n.data.groupName || 'Unknown Group'}</div>
                              </>
                            )}
                            {(n.type === 'CHALLENGE_REQUEST_APPROVED' || n.type === 'CHALLENGE_REQUEST_REJECTED') && (
                              <div><strong>Group:</strong> {n.data.groupName || 'Unknown Group'}</div>
                            )}
                          </div>
                        )}
                        {/* Show formatted data for challenge invites */}
                        {n.type === 'CHALLENGE_INVITE' && n.data && (
                          <div className="text-sm text-gray-600">
                            <div><strong>Challenge:</strong> {n.data.challengeName || 'Untitled Challenge'}</div>
                            <div><strong>From:</strong> {n.data.fromUserName || 'Unknown'}</div>
                          </div>
                        )}
                        {/* Show raw JSON for other types */}
                        {n.type !== 'CHALLENGE_REQUEST' && n.type !== 'CHALLENGE_INVITE' && (
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">{JSON.stringify(n.data, null, 2)}</pre>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!n.isRead && (
                          <button className="px-3 py-1 bg-gray-200 rounded" onClick={()=>markRead(n.id)}>Mark read</button>
                        )}
                        {n.type === 'GROUP_INVITE' && n.data?.inviteId && (
                          <>
                            {(n.inviteMeta?.status === 'PENDING' || !n.inviteMeta) ? (
                              <>
                                <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={()=>handleGroupInviteAction('accept', n.data.inviteId)}>Accept</button>
                                <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={()=>handleGroupInviteAction('reject', n.data.inviteId)}>Reject</button>
                              </>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700">
                                {n.inviteMeta?.status || 'N/A'}
                              </span>
                            )}
                          </>
                        )}
                        {n.type === 'COURSE_INVITE' && n.data?.inviteId && (
                          <>
                            {(n.inviteMeta?.status === 'PENDING' || !n.inviteMeta) ? (
                              <>
                                <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={()=>handleCourseInviteAction('accept', n.data.inviteId)}>Accept</button>
                                <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={()=>handleCourseInviteAction('reject', n.data.inviteId)}>Reject</button>
                              </>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700">
                                {n.inviteMeta?.status || 'N/A'}
                              </span>
                            )}
                          </>
                        )}
                        {n.type === 'COURSE_ACCESS_CHANGED' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              Role changed to {n.data?.newAccess || 'N/A'}
                            </span>
                            {n.data?.courseId && (
                              <button
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                                onClick={() => router.push(`/courses/${n.data.courseId}`)}
                              >
                                View Course
                              </button>
                            )}
                          </div>
                        )}
                        {n.type === 'COURSE_ACCESS_REMOVED' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                            Access removed
                          </span>
                        )}
                        {n.type === 'CHALLENGE_REQUEST' && n.data?.requestId && (
                          <>
                            {(n.requestMeta?.status === 'PENDING' || !n.requestMeta) ? (
                              <>
                                <button 
                                  className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  onClick={() => handleChallengeRequestAction('approve', n.data.requestId)}
                                  disabled={!!actionLoading[n.data.requestId]}
                                >
                                  {actionLoading[n.data.requestId] === 'approve' && <Loader2 className="w-3 h-3 animate-spin" />}
                                  Approve
                                </button>
                                <button 
                                  className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  onClick={() => handleChallengeRequestAction('reject', n.data.requestId)}
                                  disabled={!!actionLoading[n.data.requestId]}
                                >
                                  {actionLoading[n.data.requestId] === 'reject' && <Loader2 className="w-3 h-3 animate-spin" />}
                                  Reject
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700">
                                  {n.requestMeta?.status || 'N/A'}
                                </span>
                                {n.requestMeta?.status === 'APPROVED' && n.requestMeta?.challenge?.id && (
                                  <button
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                                    onClick={() => router.push(`/challenges/${n.requestMeta.challenge.id}`)}
                                  >
                                    View Challenge
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {(n.type === 'CHALLENGE_REQUEST_APPROVED' || n.type === 'CHALLENGE_REQUEST_REJECTED') && n.data && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              n.type === 'CHALLENGE_REQUEST_APPROVED' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {n.type === 'CHALLENGE_REQUEST_APPROVED' ? 'APPROVED' : 'REJECTED'}
                            </span>
                            {n.type === 'CHALLENGE_REQUEST_APPROVED' && n.data?.challengeId && (
                              <button
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                                onClick={() => router.push(`/challenges/${n.data.challengeId}`)}
                              >
                                View Challenge
                              </button>
                            )}
                          </div>
                        )}
                        {n.type === 'CHALLENGE_INVITE' && n.data?.inviteId && (
                          <>
                            {(n.inviteMeta?.status === 'PENDING' || !n.inviteMeta) ? (
                              <>
                                <button 
                                  className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  onClick={() => handleChallengeInviteAction('accept', n.data.inviteId)}
                                  disabled={!!actionLoading[n.data.inviteId]}
                                >
                                  {actionLoading[n.data.inviteId] === 'accept' && <Loader2 className="w-3 h-3 animate-spin" />}
                                  Accept
                                </button>
                                <button 
                                  className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  onClick={() => handleChallengeInviteAction('reject', n.data.inviteId)}
                                  disabled={!!actionLoading[n.data.inviteId]}
                                >
                                  {actionLoading[n.data.inviteId] === 'reject' && <Loader2 className="w-3 h-3 animate-spin" />}
                                  Reject
                                </button>
                                {n.data?.challengeId && (
                                  <button
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                                    onClick={() => router.push(`/challenges/${n.data.challengeId}`)}
                                  >
                                    View
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700">
                                  {n.inviteMeta?.status || 'N/A'}
                                </span>
                                {n.inviteMeta?.challenge?.id && (
                                  <button
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                                    onClick={() => router.push(`/challenges/${n.inviteMeta.challenge.id}`)}
                                  >
                                    View Challenge
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


