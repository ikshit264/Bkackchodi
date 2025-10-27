/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import { getBatchProjectsByBatchId } from "../actions/batch";
import ProjectList from "../projects/ProjectList";
import { Batch, Project } from "../shared/schema/Project";

const BatchCard = ({ 
  userId, 
  batch, 
  activeBatchId, 
  setActiveBatchId 
}: { 
  userId: string; 
  batch: Batch; 
  activeBatchId: string | null;
  setActiveBatchId: (id: string | null) => void;
}) => {
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const isActive = activeBatchId === batch.id;

  const fetchProjectDetails = async () => {
    try {
      const response = await getBatchProjectsByBatchId(userId, batch.id);
      console.log(response);
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

  return (
    <div className="relative">
      <div
        className="bg-white dark:bg-neutral-800 shadow-md rounded-lg p-4 m-2 w-72 border border-gray-300 dark:border-neutral-700 text-center relative cursor-pointer"
        onClick={handleClick}
      >
        <h2 className="text-lg font-semibold text-black dark:text-gray-200 text-left w-full">
          Module {batch.number + 1}
        </h2>
        {batch.projects && batch.projects.length > 0 &&
          batch.projects
            .sort((a, b) => a.position - b.position)
            .map((project: any) => (
              <p
                key={project.id}
                className="text-gray-500 dark:text-gray-400 text-sm mt-2 truncate text-left ml-4 cursor-pointer"
              >
                {project.title}
              </p>
            ))}

        <div
          className={`absolute top-2 right-2 h-4 w-4 rounded-full ${levelColors[level]}`}
        ></div>
      </div>

      <ProjectList 
        Batch={projectDetails} 
        activeTab={isActive ? batch.id : null} 
        setActiveTab={setActiveBatchId}
      />
    </div>
  );
};

export default BatchCard;
