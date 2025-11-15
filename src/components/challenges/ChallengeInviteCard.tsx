"use client";

import React from "react";
import Link from "next/link";
import { Clock, User, Book, FileText } from "lucide-react";

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

interface ChallengeInviteCardProps {
  invite: ChallengeInvite;
  onAccept: (inviteId: string) => void;
  onReject: (inviteId: string) => void;
}

const ChallengeInviteCard: React.FC<ChallengeInviteCardProps> = ({
  invite,
  onAccept,
  onReject,
}) => {
  const daysRemaining = invite.expiresAt
    ? Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700 hover:border-blue-500 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-bold">
              INVITATION
            </span>
            {invite.challenge.status === "DRAFT" && (
              <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-bold">
                DRAFT
              </span>
            )}
            {invite.challenge.status === "ACTIVE" && (
              <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">
                ACTIVE
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{invite.challenge.name}</h3>
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{invite.challenge.description}</p>
          
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <User className="w-4 h-4" />
            <span>
              From: {invite.fromUser.name} {invite.fromUser.lastName} (@{invite.fromUser.userName})
            </span>
          </div>

          {invite.challenge.course && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <Book className="w-4 h-4" />
              <span>Course: {invite.challenge.course.title}</span>
            </div>
          )}

          {invite.challenge.project && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <FileText className="w-4 h-4" />
              <span>Project: {invite.challenge.project.title}</span>
            </div>
          )}

          {invite.challenge.group && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <User className="w-4 h-4" />
              <span>Group: {invite.challenge.group.name}</span>
            </div>
          )}

          {invite.expiresAt && daysRemaining !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Clock className="w-4 h-4" />
              <span>
                {daysRemaining > 0
                  ? `Expires in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
                  : "Expired"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => onAccept(invite.id)}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={() => onReject(invite.id)}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
        >
          Reject
        </button>
        <Link
          href={`/challenges/${invite.challenge.id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ChallengeInviteCard;

