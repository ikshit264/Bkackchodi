"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Clock, User, Book, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface ChallengeRequest {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  courseId: string | null;
  projectId: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
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

interface ChallengeRequestCardProps {
  request: ChallengeRequest;
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  canApprove: boolean;
}

const ChallengeRequestCard: React.FC<ChallengeRequestCardProps> = ({
  request,
  onApprove,
  onReject,
  canApprove,
}) => {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    setActionType("approve");
    try {
      await onApprove(request.id);
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this challenge request?")) {
      return;
    }
    setLoading(true);
    setActionType("reject");
    try {
      await onReject(request.id);
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };
  return (
    <div className={`bg-gray-800 rounded-lg p-6 border-4 border-slate-700 hover:border-blue-500 transition-all ${loading ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-bold">
              REQUEST
            </span>
            {request.status === "PENDING" && (
              <span className="px-2 py-1 bg-yellow-500 text-white rounded text-xs font-bold">
                PENDING
              </span>
            )}
            {request.status === "APPROVED" && (
              <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">
                APPROVED
              </span>
            )}
            {request.status === "REJECTED" && (
              <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">
                REJECTED
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{request.name}</h3>
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{request.description}</p>
          
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <User className="w-4 h-4" />
            <span>
              Requested by: {request.requester.name} {request.requester.lastName} (@{request.requester.userName})
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <User className="w-4 h-4" />
            <span>Group: {request.group.name}</span>
          </div>

          {request.courseId && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <Book className="w-4 h-4" />
              <span>Course attached</span>
            </div>
          )}

          {request.projectId && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <FileText className="w-4 h-4" />
              <span>Project attached</span>
            </div>
          )}

          {request.challenge && (
            <div className="mt-2">
              <Link
                href={`/challenges/${request.challenge.id}`}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View Challenge →
              </Link>
            </div>
          )}
        </div>
      </div>

      {request.status === "PENDING" && canApprove && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && actionType === "approve" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {loading && actionType === "approve" ? "Processing..." : "Approve"}
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && actionType === "reject" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {loading && actionType === "reject" ? "Processing..." : "Reject"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ChallengeRequestCard;

