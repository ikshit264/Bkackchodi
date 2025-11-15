/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import { getBatchProjectsByBatchId } from "../actions/batch";
import ProjectList from "../projects/ProjectList";
import { Batch, Project } from "../shared/schema/Project";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronUp } from "lucide-react";

const BatchCard = ({ 
  batch, 
  activeBatchId, 
  setActiveBatchId,
  canEdit,
  courseId,
  role,
}: { 
  batch: Batch; 
  activeBatchId: string | null;
  setActiveBatchId: (id: string | null) => void;
  canEdit?: boolean;
  courseId?: string | null;
  role?: 'OWNER'|'READ_ONLY'|'SYNC_COPY'|'COPY'|null;
}) => {
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const isActive = activeBatchId === batch.id;

  const fetchProjectDetails = async () => {
    try {
      const response = await getBatchProjectsByBatchId(batch.id);
      console.log("response from batch", response);
      setProjectDetails(response);
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
  };

  const handleClick = () => {
    if (isActive) {
      setActiveBatchId(null);
    } else {
      setActiveBatchId(batch.id);
      fetchProjectDetails();
    }
  };

  const AvgLevel = (projects: Project[]) => {
    const levelsCount = {
      Beginner: 0,
      Intermediate: 0,
      Advanced: 0,
      Expert: 0,
    };

    projects.forEach((project: Project) => {
      if (levelsCount.hasOwnProperty(project.level)) {
        levelsCount[project.level]++;
      }
    });

    if (projects.length === 0) return "Unknown";

    return Object.keys(levelsCount).reduce((a, b) =>
      levelsCount[a] >= levelsCount[b] ? a : b
    );
  };

  const level = AvgLevel(batch.projects || []);

  const levelColors: { [key: string]: string } = {
    Beginner: "bg-green-500",
    Intermediate: "bg-yellow-500",
    Advanced: "bg-orange-500",
    Expert: "bg-red-500",
    Unknown: "bg-gray-400",
  };

  const levelLabels: { [key: string]: string } = {
    Beginner: "Beginner",
    Intermediate: "Intermediate",
    Advanced: "Advanced",
    Expert: "Expert",
    Unknown: "Unknown",
  };

  // Derive a batch status from its projects
  const getBatchStatus = (projects: Project[]) => {
    if (!projects || projects.length === 0) return "No Projects";
    const statuses = projects.map((p) => p.status);

    if (statuses.every((s) => s === "completed")) return "Completed";
    if (statuses.some((s) => s === "in progress")) return "In Progress";
    if (statuses.every((s) => s === "not started")) return "Not Started";

    return "Mixed";
  };

  const batchStatus = getBatchStatus(batch.projects || []);

  // Status colors
  const statusColors: { [key: string]: { bg: string; text: string; border: string } } = {
    "Completed": {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-300",
      border: "border-green-200 dark:border-green-700",
    },
    "In Progress": {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-700",
    },
    "Not Started": {
      bg: "bg-gray-50 dark:bg-gray-700/50",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200 dark:border-gray-600",
    },
    "Mixed": {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      text: "text-yellow-700 dark:text-yellow-300",
      border: "border-yellow-200 dark:border-yellow-700",
    },
    "No Projects": {
      bg: "bg-neutral-50 dark:bg-neutral-700/50",
      text: "text-neutral-700 dark:text-neutral-300",
      border: "border-neutral-200 dark:border-neutral-600",
    },
  };

  const getProjectStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "in progress":
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />;
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "in progress":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
  };

  const sortedProjects = batch.projects
    ? [...batch.projects].sort((a, b) => a.position - b.position)
    : [];

  const completedCount = sortedProjects.filter((p: any) => p.status === "completed").length;
  const totalCount = sortedProjects.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 ${
          statusColors[batchStatus]?.border || "border-gray-200 dark:border-gray-700"
        } overflow-hidden cursor-pointer transition-all duration-300 ${
          isActive ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
        }`}
        onClick={handleClick}
      >
        {/* Header */}
        <div className={`p-4 ${statusColors[batchStatus]?.bg || "bg-gray-50 dark:bg-gray-700/50"} border-b ${
          statusColors[batchStatus]?.border || "border-gray-200 dark:border-gray-600"
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Module {batch.number !== undefined ? batch.number + 1 : 'N/A'}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                  statusColors[batchStatus]?.text || "text-gray-700 dark:text-gray-300"
                }`}>
                  {batchStatus}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {levelLabels[level]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${levelColors[level]}`} title={levelLabels[level]} />
              {isActive ? (
                <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  {completedCount} / {totalCount} projects
                </span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {progressPercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Projects List */}
        <div className="p-4 space-y-2">
          {sortedProjects.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              No projects in this module
            </p>
          ) : (
            sortedProjects.map((project: any, index: number) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getProjectStatusIcon(project.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium line-clamp-2 ${
                    getProjectStatusColor(project.status)
                  }`}>
                    {project.title}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5 block">
                    {project.status || "not started"}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Project Details Panel */}
      <ProjectList 
        Batch={projectDetails} 
        activeTab={isActive ? batch.id : null} 
        setActiveTab={setActiveBatchId}
        courseId={courseId}
        role={role}
      />
    </div>
  );
};

export default BatchCard;
