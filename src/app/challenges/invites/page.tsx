"use client";

import React, { useEffect, useState, useCallback } from "react";
import ChallengeInviteCard from "../../../components/challenges/ChallengeInviteCard";
import Loading from "../../(root)/loading";

interface ChallengeInvite {
  id: string;
  challenge: {
    id: string;
    name: string;
    description: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    course?: { id: string; title: string } | null;
    project?: { id: string; title: string } | null;
    group?: { id: string; name: string } | null;
    creator: {
      id: string;
      userName: string;
      name: string;
      lastName: string;
      avatar: string | null;
    };
  };
  fromUser: {
    id: string;
    userName: string;
    name: string;
    lastName: string;
    avatar: string | null;
  };
  expiresAt: string | null;
  createdAt: string;
}

const ChallengeInvitesPage = () => {
  const [invites, setInvites] = useState<ChallengeInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("pending");

  const fetchInvites = useCallback(async () => {
    try {
      setLoading(true);
      const status = filter === "all" ? null : filter.toUpperCase();
      const url = status ? `/api/challenges/invites?status=${status}` : "/api/challenges/invites";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInvites(data.data as ChallengeInvite[]);
      }
    } catch (error) {
      console.error("Error fetching invites:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  

  const handleAccept = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/challenges/invites/${inviteId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert("Challenge invitation accepted! Course/project has been added to your account.");
        fetchInvites();
        // Redirect to challenge
        if (data.data?.challengeId) {
          window.location.href = `/challenges/${data.data.challengeId}`;
        }
      } else {
        alert(data.error || "Failed to accept invitation");
      }
    } catch (error) {
      console.error("Error accepting invite:", error);
      alert("Failed to accept invitation");
    }
  };

  const handleReject = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/challenges/invites/${inviteId}/reject`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchInvites();
      } else {
        alert(data.error || "Failed to reject invitation");
      }
    } catch (error) {
      console.error("Error rejecting invite:", error);
      alert("Failed to reject invitation");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gradient-to-br p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Challenge Invitations</h1>
          <p className="text-gray-400">Accept or reject challenge invitations</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
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
          {invites.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              No challenge invitations found.
            </div>
          ) : (
            invites.map((invite) => (
              <ChallengeInviteCard
                key={invite.id}
                invite={invite}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeInvitesPage;

