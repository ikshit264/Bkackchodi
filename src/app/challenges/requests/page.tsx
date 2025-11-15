"use client";

import React, { useEffect, useState, useCallback } from "react";
import ChallengeRequestCard from "../../../components/challenges/ChallengeRequestCard";
import Loading from "../../(root)/loading";

interface ChallengeRequest {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  courseId: string | null;
  projectId: string | null;
  requester: {
    id: string;
    userName: string;
    name: string;
    lastName: string;
    avatar: string | null;
  };
  group: {
    id: string;
    name: string;
  };
  challenge?: {
    id: string;
    name: string;
    status: string;
  } | null;
}

const ChallengeRequestsPage = () => {
  const [requests, setRequests] = useState<ChallengeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [groupId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/challenges/requests?status=${filter === "all" ? "" : filter.toUpperCase()}`;
      if (groupId) {
        url += `&groupId=${groupId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data as ChallengeRequest[]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }, [filter, groupId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/challenges/requests/${requestId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert("Challenge request approved! Challenge created and invitations sent to group members. You have been automatically added as a participant.");
        await fetchRequests();
        if (data.data.challenge) {
          // Optionally redirect to challenge
          // window.location.href = `/challenges/${data.data.challenge.id}`;
        }
      } else {
        alert(data.error || "Failed to approve request");
      }
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    // Confirmation is now handled in the card component
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/challenges/requests/${requestId}/reject`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert("Challenge request rejected.");
        await fetchRequests();
      } else {
        alert(data.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gradient-to-br p-6 relative">
      {actionLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            <span>Processing...</span>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Challenge Requests</h1>
          <p className="text-gray-400">Approve or reject challenge requests from group members</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              No challenge requests found.
            </div>
          ) : (
            requests.map((request) => {
              // Check if current user can approve (owner/admin of the group)
              // This will be determined on the backend, but for UI we'll show buttons for pending requests
              const canApprove = request.status === "PENDING";
              return (
                <ChallengeRequestCard
                  key={request.id}
                  request={request}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  canApprove={canApprove}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeRequestsPage;

