"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Loader,
  X,
} from "lucide-react";
import axios from "axios";
import { UserId as fetchUserId } from "../../utils/userId";
import { GetUserByUserId } from "../actions/user";
import { GetProjectByProjectId } from "../actions/project";
import { CreateIssue } from "../courses/GithubFunctions";
import GithubPart from "./GithubPart";
import Loading from "../../app/(root)/loading";
import ProgressModal from "../shared/ProgressModal";
import { ProgressUpdate } from "../../utils/github/progressTracker";

const ProjectDetail = ({ 
  project: initialProject, 
  canEdit,
}: { 
  project: {
    id: string;
    title: string;
    description?: string;
    learningObjectives?: unknown[];
    steps?: unknown[];
    batchId?: string;
    [key: string]: unknown;
  }, 
  canEdit: boolean,
  role?: 'OWNER'|'READ_ONLY'|'SYNC_COPY'|'COPY'|null,
  courseId?: string | null,
  batchId?: string | null,
}) => {
  const [project, setProject] = useState(initialProject);
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [isObjectivesExpanded, setIsObjectivesExpanded] = useState(false);
  const [steps, setSteps] = useState(() => {
    // Initialize steps once using a function to prevent re-initialization on re-render
    return (initialProject.steps || []).map((step, index) => {
      if (index === 0 && step.status !== "completed") {
        return { ...step, status: "in progress" };
      }
      return step;
    });
  });
  const [loading, setLoading] = useState(false);
  const userId = fetchUserId();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("projects");
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [existingRepos, setExistingRepos] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState("");
  const [matchingRepos, setMatchingRepos] = useState<string[]>([]);
  const [debouncedRepoName, setDebouncedRepoName] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      if (userId !== null) console.log("userId", userId);
      try {
        const fetchedUser = await GetUserByUserId(userId);
        if (fetchedUser) setUser(fetchedUser);
        console.log("fetchedUser", fetchedUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
    // console.log(user)
  }, [userId]);

  useEffect(() => {
    setSteps(initialProject.steps);
  }, [initialProject.steps]);

  // Simple edit distance calculation
  const getEditDistance = useCallback((str1: string, str2: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }, []);

  // Helper function to calculate string similarity (simple Levenshtein-like)
  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = getEditDistance(longer, shorter);
    if (longer.length === 0) return 1.0;
    return (longer.length - editDistance) / longer.length;
  }, [getEditDistance]);

  // Debounce repo name input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRepoName(repoName);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [repoName]);

  // Filter matching repos based on debounced input
  useEffect(() => {
    if (!debouncedRepoName.trim()) {
      setMatchingRepos([]);
      return;
    }

    const searchTerm = debouncedRepoName.trim().toLowerCase();
    
    // Find exact matches first, then similar matches
    const exactMatches = existingRepos.filter(
      (repo) => repo.toLowerCase() === searchTerm
    );
    
    // Find repos that contain the search term or are similar
    const similarMatches = existingRepos.filter(
      (repo) => {
        const repoLower = repo.toLowerCase();
        return (
          repoLower !== searchTerm && // Exclude exact matches
          (repoLower.includes(searchTerm) || 
           searchTerm.includes(repoLower) ||
           repoLower.startsWith(searchTerm) ||
           calculateSimilarity(repoLower, searchTerm) > 0.5)
        );
      }
    );

    // Combine exact matches first, then similar matches (limit to 20 for performance)
    const allMatches = [...exactMatches, ...similarMatches].slice(0, 20);
    setMatchingRepos(allMatches);
  }, [debouncedRepoName, existingRepos, calculateSimilarity]);

  const getProjectStatus = useCallback(() => {
    if (!steps || steps.length === 0) return "Not Started";
    return steps.every((s) => s.status === "completed")
      ? "Completed"
      : "In Progress";
  }, [steps]);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in progress":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const handleStepStatusChange = (stepIndex) => {
    const updatedSteps = [...steps];

    // Allow changing from "not started" to "in progress" for the first step
    if (updatedSteps[stepIndex].status === "not started") {
      if (
        stepIndex === 0 ||
        updatedSteps[stepIndex - 1].status === "completed"
      ) {
        updatedSteps[stepIndex].status = "in progress";
      } else {
        return; // Can't start a step if previous step isn't completed
      }
    } else if (updatedSteps[stepIndex].status === "in progress") {
      updatedSteps[stepIndex].status = "completed";
    } else if (updatedSteps[stepIndex].status === "completed") {
      updatedSteps[stepIndex].status = "not started";

      for (let i = stepIndex + 1; i < updatedSteps.length; i++) {
        updatedSteps[i].status = "not started";
      }
    }

    for (let i = 0; i < updatedSteps.length; i++) {
      if (i === 0 || updatedSteps[i - 1].status === "completed") {
        if (updatedSteps[i].status !== "completed") {
          updatedSteps[i].status = "in progress";
          break;
        }
      } else {
        updatedSteps[i].status = "not started";
      }
    }

    setSteps(updatedSteps);
    console.log("Steps", steps);
  };

  const fetchRepos = async () => {
    try {
      setLoadingRepos(true);
      setRepoError("");
      const response = await axios.get<{ repos: Array<{ name: string; fullName: string; private: boolean }> }>("/api/github/repos");
      if (response.status === 200 && response.data.repos) {
        const repoNames = response.data.repos.map((repo) => repo.name);
        setExistingRepos(repoNames);
      } else {
        throw new Error("Failed to fetch repositories");
      }
    } catch (err) {
      console.error("Error fetching repos:", err);
      const error = err as { response?: { data?: { error?: string } } };
      setRepoError(error.response?.data?.error || "Failed to fetch repositories");
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleStartProjectClick = () => {
    setShowRepoModal(true);
    setRepoName(project.title);
    setRepoError("");
    setMatchingRepos([]);
    setDebouncedRepoName("");
    fetchRepos();
  };

  const validateAndSubmitRepoName = () => {
    if (!repoName || repoName.trim() === "") {
      setRepoError("Repository name cannot be empty");
      return;
    }

    const sanitizedName = repoName.trim().toLowerCase();
    
    // Check if repo name matches any existing repo
    if (existingRepos.some((repo) => repo.toLowerCase() === sanitizedName)) {
      setRepoError("A repository with this name already exists. Please choose a different name.");
      return;
    }

    // Validate repo name format (GitHub rules)
   

    if (repoName.trim().length > 100) {
      setRepoError("Repository name must be 100 characters or less.");
      return;
    }

    // Name is valid and unique
    setShowRepoModal(false);
    setRepoError("");
    startProjectWithRepoName(repoName.trim());
  };

  const startProjectWithRepoName = async (repoNameToUse: string) => {
    try {
      // Show progress modal immediately - NO loading screen
      setShowProgress(true);
      setProgress({ stage: "initializing", message: "Initializing project setup...", current: 0, total: 100 });

      // Step 1: Sending response to AI
      setProgress({ stage: "sending_to_ai", message: "Sending request to AI...", current: 10, total: 100 });
      
      const response = await axios.post("/api/ai/project", {
        topic: project.title,
        learning_objectives: project.learningObjectives,
        projectId: project.id,
      });

      if (response.status !== 200) {
        throw new Error("Failed to fetch project data.");
      }

      // Step 2: Parsing the data
      setProgress({ stage: "parsing_data", message: "Parsing AI response...", current: 30, total: 100 });
      
      const parsedData = JSON.parse(response.data.jsonObject || "{}");

      // Step 3: Getting project info
      setProgress({ stage: "getting_project_info", message: "Getting project information...", current: 40, total: 100 });

      const stepsData = (parsedData?.steps || []).map((step, index) => ({
        index,
        step,
        status: "pending",
        issueId: null,
      }));

      // Get the batchId from the project
      const batchId = project.batchId;
      const projectTitle = batchId ? `${batchId}-Batch` : repoNameToUse;

      // Step 4: Making project ready for GitHub
      setProgress({ stage: "preparing_github", message: "Preparing project for GitHub upload...", current: 50, total: 100 });

      // Call CreateIssue function with the validated repo name and progress callback
      const updatedSteps = await CreateIssue(
        user.githubId,
        repoNameToUse, // Use validated repo name instead of project.title
        "user",
        project.id,
        projectTitle,
        batchId,
        userId,
        stepsData,
        (update) => {
          // Scale progress from 50-95% for GitHub operations
          const githubProgress = 50 + (update.current || 0) * 45 / (update.total || 1);
          setProgress({
            ...update,
            current: Math.round(githubProgress),
            total: 100,
          });
        }
      );

      console.log("updatedSteps", updatedSteps);

      // Step 5: Finalizing
      setProgress({ stage: "completed", message: "Saving project data...", current: 95, total: 100 });

      // Map back the issueId to their respective steps
      const newSteps = parsedData.steps.map((step, index) => ({
        stepTitle: step,
        issueId: updatedSteps[index]?.issueId || null,
        itemId: updatedSteps[index]?.itemId || null,
        status: "not started",
      }));

      // Update the project with updated steps
      await axios.patch("/api/query/project", {
        projectId: project.id,
        updatedFields: { steps: newSteps },
      });

      // Fetch the updated project instead of refreshing the page
      const updatedProject = await GetProjectByProjectId(project.id);
      setProject(updatedProject);
      setSteps(updatedProject.steps || []);

      // Complete
      setProgress({ stage: "completed", message: "Project setup completed successfully!", current: 100, total: 100 });

      // Hide progress modal after a short delay
      setTimeout(() => {
        setShowProgress(false);
        setProgress(null);
      }, 1500);
    } catch (error) {
      console.error("Error starting project:", error);
      setProgress({
        stage: "error",
        message: "Failed to start project. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      setTimeout(() => {
        setShowProgress(false);
        setProgress(null);
      }, 3000);
    }
    // NO setLoading(false) - we don't use loading screen anymore
  };

  const saveProgress = async () => {
    try {
      setLoading(true);

      await axios.patch("/api/query/project", {
        projectId: project.id,
        updatedFields: { steps },
      });

      // If the project has GitHub integration
      if (user?.githubId && steps.some((step) => step.issueId)) {
        const issueIdandStatus = steps
          .filter((step) => step.issueId)
          .map((step) => ({
            status: step.status,
            issueId: step.issueId,
            itemId: step.itemId,
          }));

        // Call the GitHub issue update API
        await axios.post("/api/ai/github/projects/issue", {
          userId,
          owner: user.githubId,
          issues: issueIdandStatus,
          batchId: project.batchId,
        });
      }

      alert("Progress saved successfully!");
    } catch (error) {
      console.error("Error saving progress:", error);
      alert("Failed to save progress. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = useCallback((status) => {
    let icon;
    switch (status) {
      case "Completed":
        icon = <CheckCircle size={16} className="text-green-600" />;
        return (
          <div className="flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-600">
            {icon} <span className="ml-1">Completed</span>
          </div>
        );
      case "In Progress":
        icon = <Clock size={16} className="text-yellow-600" />;
        return (
          <div className="flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-600">
            {icon} <span className="ml-1">In Progress</span>
          </div>
        );
      default:
        icon = <AlertCircle size={16} className="text-gray-600" />;
        return (
          <div className="flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
            {icon} <span className="ml-1">Not Started</span>
          </div>
        );
    }
  }, []);

  return (
    <>
      <ProgressModal 
        isOpen={showProgress} 
        progress={progress}
        onClose={() => setShowProgress(false)}
      />
      <div className="flex justify-center items-center min-h-screen p-4">
        <div className="w-full max-w-4xl space-y-6">
          {/* Loading Overlay - Only show for saveProgress, not for project start */}
          {loading && !showProgress && <Loading />}

        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "projects"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab("github")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "github"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            GitHub Evaluation
          </button>
        </div>

        {/* Main Project Card */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {project.title}
                  </h1>
                  <p className="text-gray-600 mt-1">{project.description}</p>
                  {project.level && (
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 whitespace-nowrap rounded-full text-sm font-medium">
                      {project.level}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 whitespace-nowrap">
                  {renderStatusBadge(getProjectStatus())}

                  {/* Start Project Button - Only show if no steps */}
                  {(!steps || steps.length === 0) && (
                    <button
                      onClick={handleStartProjectClick}
                      disabled={loading || loadingRepos || !canEdit}
                      className={`flex items-center px-4 py-2 font-medium rounded-lg shadow transition-colors ${canEdit ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'}`}
                    >
                      <Play size={16} className="mr-2" /> Start Project
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Details Section */}
          {activeTab === "projects" ? (
            <div className="p-6">
              <div className="mb-6">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setIsObjectivesExpanded(!isObjectivesExpanded)}
                >
                  <h2 className="text-lg font-semibold text-gray-800">
                    Learning Objectives
                  </h2>
                  {isObjectivesExpanded ? (
                    <ChevronUp size={20} className="text-gray-600" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-600" />
                  )}
                </div>
                {isObjectivesExpanded && (
                  <div className="mt-3 pl-2 border-l-2 border-blue-300">
                    {project.learningObjectives &&
                    project.learningObjectives.length > 0 ? (
                      <ul className="space-y-2">
                        {project.learningObjectives.map((objective, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span className="text-gray-700">{objective}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic">
                        No learning objectives specified
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Only show steps section if we have steps */}
              {steps && steps.length > 0 && (
                <div>
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setIsStepsExpanded(!isStepsExpanded)}
                  >
                    <h2 className="text-lg font-semibold text-gray-800">
                      Project Steps
                    </h2>
                    {isStepsExpanded ? (
                      <ChevronUp size={20} className="text-gray-600" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-600" />
                    )}
                  </div>
                  {isStepsExpanded && (
                    <div className="mt-4 space-y-3">
                      {steps.map((step, index) => (
                        <div
                          key={index}
                          className="flex flex-col p-4 border rounded-lg shadow-sm bg-white"
                        >
                          {/* Step Header */}
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={step.status === "completed"}
                              onChange={() => handleStepStatusChange(index)}
                              className="w-5 h-5 mr-3 rounded-full border-2 border-gray-300 focus:ring-blue-500"
                            />
                            <div className="flex-grow">
                              <p
                                className={`text-lg font-semibold text-gray-800 ${
                                  step.status === "completed"
                                    ? "line-through"
                                    : ""
                                }`}
                              >
                                {String(step.stepTitle.stepTitle)}
                              </p>
                            </div>
                            <span
                              className={`ml-3 px-3 py-1 rounded-full text-xs ${getStatusColor(
                                step.status
                              )}`}
                            >
                              {step.status}
                            </span>
                          </div>

                          {/* Step Description */}
                          {step.stepTitle.description && (
                            <p className="mt-2 text-xs text-gray-600">
                              {String(step.stepTitle.description)}
                            </p>
                          )}

                          {/* GitHub Commit Instruction */}
                          {/* {step.stepTitle.githubCommitInstruction && (
                          <p className="mt-2 text-green-600 font-semibold">
                            {String(step.githubCommitInstruction)}
                          </p>
                        )} */}

                          {/* Resources */}
                          {Array.isArray(step.stepTitle.resources) &&
                            step.stepTitle.resources.length > 0 && (
                              <div className="mt-3">
                                <h3 className="font-medium text-gray-700">
                                  Resources:
                                </h3>
                                <ul className="list-disc list-inside text-blue-500">
                                  {step.stepTitle.resources.map(
                                    (resource, idx) => (
                                      <li key={idx}>
                                        <a
                                          href={resource.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="underline"
                                        >
                                          {resource.title}
                                        </a>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <GithubPart projectId={project.id} />
          )}
        </div>

        {/* Save Progress Button - Only show if we have steps */}
        {steps && steps.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={saveProgress}
              disabled={loading || !canEdit}
              className={`px-6 py-3 font-medium rounded-lg shadow transition-colors ${canEdit ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'}`}
            >
              Save Progress
            </button>
          </div>
        )}
      </div>

      {/* Repository Name Input Modal */}
      {showRepoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Enter Repository Name
              </h2>
              <button
                onClick={() => {
                  setShowRepoModal(false);
                  setRepoError("");
                  setRepoName("");
                  setMatchingRepos([]);
                  setDebouncedRepoName("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {loadingRepos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader size={24} className="animate-spin text-blue-600 mr-3" />
                  <span className="text-gray-600">Fetching repositories...</span>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label
                      htmlFor="repoName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Repository Name
                    </label>
                    <input
                      type="text"
                      id="repoName"
                      value={repoName}
                      onChange={(e) => {
                        setRepoName(e.target.value);
                        setRepoError("");
                      }}
                      placeholder="Enter a unique repository name"
                      className="w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          validateAndSubmitRepoName();
                        }
                      }}
                    />
                    {repoError && (
                      <p className="mt-2 text-sm text-red-600">{repoError}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      Repository name must be unique and can only contain letters, numbers, periods, hyphens, and underscores.
                    </p>
                  </div>
                  {/* Real-time matching repos display */}
                  <div className="mb-4">
                    {repoName.trim() ? (
                      <>
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">
                            {matchingRepos.length > 0
                              ? `Similar repositories (${matchingRepos.length} found):`
                              : "No similar repositories found"}
                          </span>
                        </p>
                        <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                          {matchingRepos.length > 0 ? (
                            <div className="space-y-1">
                              {matchingRepos.map((repo, idx) => {
                                const isExactMatch =
                                  repo.toLowerCase() === repoName.trim().toLowerCase();
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center px-2 py-1 rounded text-xs ${
                                      isExactMatch
                                        ? "bg-red-100 text-red-800 border border-red-300"
                                        : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                                    }`}
                                  >
                                    {isExactMatch ? (
                                      <>
                                        <AlertCircle size={14} className="mr-2" />
                                        <span className="font-semibold">
                                          {repo} (Exact match - Not available)
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock size={14} className="mr-2" />
                                        <span>{repo} (Similar)</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center px-2 py-1 rounded text-xs bg-green-50 text-green-800 border border-green-200">
                              <CheckCircle size={14} className="mr-2" />
                              <span>Repository name is available!</span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">
                            All repositories ({existingRepos.length}):
                          </span>
                        </p>
                        <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                          {existingRepos.length > 0 ? (
                            <div className="space-y-1">
                              {existingRepos.map((repo, idx) => (
                                <div
                                  key={idx}
                                  className="px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                >
                                  <span className="text-gray-800 font-mono">{repo}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic text-center py-4">
                              No existing repositories
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowRepoModal(false);
                        setRepoError("");
                        setRepoName("");
                        setMatchingRepos([]);
                        setDebouncedRepoName("");
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={validateAndSubmitRepoName}
                      disabled={loading || !repoName.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <Loader size={16} className="animate-spin mr-2" />
                          Starting...
                        </span>
                      ) : (
                        "Start Project"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

const Page = ({ 
  params, 
  role,
  courseId,
  batchId,
}: { 
  params: { id: string }, 
  role?: 'OWNER'|'READ_ONLY'|'SYNC_COPY'|'COPY'|null,
  courseId?: string | null,
  batchId?: string | null,
}) => {
  const { id } = params;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Only OWNER can edit (COPY creates owned courses, READ_ONLY is read-only)
  const canEdit = role === 'OWNER';
  useEffect(()=>{ if (role) console.log('Project access role:', role); }, [role]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (id) {
          const projectData = await GetProjectByProjectId(id);
          setProject(projectData);
          if (!projectData) {
            setError("Project not found");
          }
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center space-x-3 bg-white p-6 rounded-lg shadow-md">
          <Loader size={24} className="animate-spin text-blue-600" />
          <p className="text-gray-800 font-medium">
            Loading project details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center text-red-500 text-lg">
            {error || "Project not found"}
          </div>
        </div>
      </div>
    );
  }

  return <ProjectDetail project={project} canEdit={canEdit} role={role} courseId={courseId} batchId={batchId} />;
};

export default Page;
