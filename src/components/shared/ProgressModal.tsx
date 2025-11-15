"use client";

import React from "react";
import { ProgressUpdate, ProgressStage } from "../../utils/github/progressTracker";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface ProgressModalProps {
  isOpen: boolean;
  progress: ProgressUpdate | null;
  onClose?: () => void;
}

const stageMessages: Record<ProgressStage, { icon: React.ReactNode; color: string }> = {
  initializing: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  sending_to_ai: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  parsing_data: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  getting_project_info: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  preparing_github: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  creating_repo: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  repo_created: { icon: <CheckCircle />, color: "text-green-500" },
  creating_project: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  project_created: { icon: <CheckCircle />, color: "text-green-500" },
  creating_issues: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  issue_created: { icon: <CheckCircle />, color: "text-green-500" },
  bulk_creating_issues: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  adding_to_project: { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" },
  completed: { icon: <CheckCircle />, color: "text-green-500" },
  error: { icon: <AlertCircle />, color: "text-red-500" },
};

export default function ProgressModal({ isOpen, progress, onClose }: ProgressModalProps) {
  if (!isOpen) return null;

  const percentage = progress?.total && progress?.current
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const stageInfo = progress?.stage ? stageMessages[progress.stage] : { icon: <Loader2 className="animate-spin" />, color: "text-blue-500" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            GitHub Setup Progress
          </h3>
          {onClose && progress?.stage === "completed" && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Progress Info */}
          <div className="flex items-center gap-3">
            <div className={`${stageInfo.color} flex-shrink-0`}>
              {stageInfo.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {progress?.message || "Processing..."}
              </p>
              {progress?.current !== undefined && progress?.total !== undefined && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {progress.current} of {progress.total} completed ({percentage}%)
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {progress?.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{progress.error}</p>
            </div>
          )}

          {/* Status Messages */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            {progress?.stage === "sending_to_ai" && (
              <p>⏳ Sending request to AI...</p>
            )}
            {progress?.stage === "parsing_data" && (
              <p>⏳ Parsing AI response...</p>
            )}
            {progress?.stage === "getting_project_info" && (
              <p>⏳ Getting project information...</p>
            )}
            {progress?.stage === "preparing_github" && (
              <p>⏳ Preparing project for GitHub upload...</p>
            )}
            {progress?.stage === "creating_repo" && (
              <p>⏳ Creating GitHub repository...</p>
            )}
            {progress?.stage === "repo_created" && (
              <p>✅ Repository created successfully</p>
            )}
            {progress?.stage === "creating_project" && (
              <p>⏳ Creating GitHub project...</p>
            )}
            {progress?.stage === "project_created" && (
              <p>✅ Project created successfully</p>
            )}
            {progress?.stage === "bulk_creating_issues" && (
              <p>⏳ Creating all issues in bulk (much faster!)...</p>
            )}
            {progress?.stage === "creating_issues" && (
              <p>⏳ Creating issues in parallel...</p>
            )}
            {progress?.stage === "issue_created" && (
              <p>✅ {progress.message}</p>
            )}
            {progress?.stage === "completed" && (
              <p className="text-green-600 dark:text-green-400 font-medium">
                ✅ {progress.message || "All operations completed successfully!"}
              </p>
            )}
            {progress?.stage === "error" && (
              <p className="text-red-600 dark:text-red-400 font-medium">
                ❌ {progress.message || "An error occurred. Please try again."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

