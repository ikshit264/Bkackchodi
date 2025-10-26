import { Play, ChevronDown, ChevronUp, CheckCircle, Circle, Clock, GitBranch, Target, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GithubEvaluation from "./GithubEvaluation";
import axios from "axios";
import { UserId as fetchUserId } from "../../utils/userId";
import { GetUserByUserId } from "../actions/user";

interface Step {
  stepTitle: string;
  status: "not started" | "in progress" | "completed";
  issueId?: string;
  itemId?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  steps: Step[];
  learningObjectives: string[];
  batchId?: string;
}

interface ProjectCardProps {
  project: Project;
  onStartProject: (projectId: string) => void;
}

const ProjectCard = ({ project, onStartProject }: ProjectCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("projects");
  const [CourseOutcomes, setCourseOutcomes] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const userId = fetchUserId();
  const [User, setUser] = useState(null);

  const getProjectStatus = (steps: Step[]) => {
    if (!steps || steps.length === 0) return "Not Started";
    return steps.every((s) => s.status === "completed")
      ? "Completed"
      : "In Progress";
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return {
          icon: CheckCircle,
          color: "text-accent-500",
          bgColor: "bg-accent-500/10",
          borderColor: "border-accent-500/20",
          gradient: "from-accent-500 to-accent-600"
        };
      case "not started":
        return {
          icon: Circle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          gradient: "from-red-500 to-red-600"
        };
      case "in progress":
      default:
        return {
          icon: Clock,
          color: "text-primary-500",
          bgColor: "bg-primary-500/10",
          borderColor: "border-primary-500/20",
          gradient: "from-primary-500 to-primary-600"
        };
    }
  };

  useEffect(() => {
    async function fetchUser () {
      const featchedUser = await GetUserByUserId(userId);
      setUser(featchedUser);
    }
  
    fetchUser();
  }, [userId])
  

  useEffect(() => {
    if (!project?.steps || project.steps.length === 0) {
      setSteps([]);
      return;
    }

    const updatedSteps : Step[] = project.steps.map((step: Step, index: number) => {
      if (index === 0 && step.status !== "completed") {
        return { ...step, status: "in progress" };
      }
      return step;
    });

    setSteps(updatedSteps);
  }, [project?.steps]);

  const handleStepStatusChange = (stepIndex: number) => {
    const updatedSteps = [...steps];

    if (updatedSteps[stepIndex].status === "not started") {
      return; // Prevent manual setting of "in progress"
    }

    // Toggle status for the selected step
    if (updatedSteps[stepIndex].status === "in progress") {
      updatedSteps[stepIndex].status = "completed";
    } else if (updatedSteps[stepIndex].status === "completed") {
      updatedSteps[stepIndex].status = "not started";

      // Reset all steps after the current one
      for (let i = stepIndex + 1; i < updatedSteps.length; i++) {
        updatedSteps[i].status = "not started";
      }
    }

    // Ensure only one "in progress" step exists, following the sequence
    for (let i = 0; i < updatedSteps.length; i++) {
      if (i === 0 || updatedSteps[i - 1].status === "completed") {
        if (updatedSteps[i].status !== "completed") {
          updatedSteps[i].status = "in progress"; // First "not completed" step becomes "in progress"
          break;
        }
      } else {
        updatedSteps[i].status = "not started"; // Prevent skipping
      }
    }

    setSteps(updatedSteps);
  };

  const handleCommit = async () => {
    try {
      const response = await axios.patch("/api/query/project", {
        projectId: project.id,
        updatedFields: { steps },
      });

      const data = await response.data;

      const issueIdandStatus = data.project.steps.map(
        (step) =>
          step.issueId && {
            status: step.status,
            issueId: step.issueId,
            itemId : step.itemId,
          }
      );

      await handleProjectIssueUpdate(issueIdandStatus, (await User).githubId);

      alert("Steps successfully committed!");
      setShowCommitModal(false);
    } catch (error) {
      console.error("Error committing steps:", error);
      alert("Failed to commit steps.");
    }
  };

  const handleProjectIssueUpdate = async (
    issues: { issueId: string; status: string, itemId : string }[],
    owner: string
  ) => {
    try {
      const response = await axios.post("/api/ai/github/projects/issue", {
        userId,
        owner,
        issues,
        batchId: project.batchId,
      });

      if (response.status === 200) {
        console.log("Issues updated successfully:", response.data);
        return response.data; // Optional: return response if needed
      } else {
        console.error("Failed to update issues:", response.statusText);
      }
    } catch (error) {
      console.error("Error updating project issues:", error);
    }
  };

  const handleStartNow = async (id: string) => {
    try {
      onStartProject(id);
    } catch (error) {console.log(error)}
  };

  const projectStatus = getProjectStatus(steps);
  const statusConfig = getStatusConfig(projectStatus);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative"
    >
      <div className="relative p-6 card-glass hover:shadow-glow transition-all duration-500">
        {/* Background gradient on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${statusConfig.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />
        
        {/* Header */}
        <div className="relative z-10 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-12 h-12 rounded-xl bg-gradient-to-r ${statusConfig.gradient} flex items-center justify-center shadow-medium group-hover:shadow-glow transition-all duration-300`}
              >
                <GitBranch className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-gradient transition-all duration-300">
                  {project.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                  {project.description}
                </p>
              </div>
            </div>
            
            {/* Status Indicator */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              <statusConfig.icon className="w-4 h-4" />
              <span className="text-xs font-medium">
                {projectStatus}
              </span>
            </motion.div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-2 mb-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("projects")}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "projects"
                  ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-medium"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <span className="flex items-center space-x-2">
                <Target size={16} />
                <span>Projects</span>
              </span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("github")}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "github"
                  ? "bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-medium"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <span className="flex items-center space-x-2">
                <Zap size={16} />
                <span>GitHub Evaluation</span>
              </span>
            </motion.button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "projects" ? (
          <div className="relative z-10">
            {!project.steps || project.steps.length === 0 ? (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStartNow(project.id)}
                className="absolute -top-3 -right-3 flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl shadow-glow hover:shadow-hard transition-all duration-300"
              >
                <Play size={16} />
                <span>Start Now</span>
              </motion.button>
            ) : (
              <div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="absolute -top-3 -right-3 flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl shadow-glow hover:shadow-hard transition-all duration-300"
                >
                  <span>{isExpanded ? "Show Less" : "Show More"}</span>
                  {isExpanded ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </motion.button>
              </div>
            )}

            {/* Learning Objectives */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mb-6"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => setCourseOutcomes(!CourseOutcomes)}
                className="flex items-center space-x-2 text-primary-500 hover:text-primary-400 transition-colors duration-300"
              >
                <Target size={16} />
                <span className="font-medium">Course Outcomes</span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-300 ${CourseOutcomes ? 'rotate-180' : ''}`}
                />
              </motion.button>
              
              <AnimatePresence>
                {CourseOutcomes && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4"
                  >
                    <div className="bg-neutral-100/30 dark:bg-neutral-800/30 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Learning Objectives:</h4>
                      <ul className="space-y-2">
                        {project.learningObjectives.map((objective: string, index: number) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start space-x-2 text-sm text-neutral-600 dark:text-neutral-400"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                            <span>{objective}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Steps */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {steps.length > 0 && (
                    <div className="bg-neutral-100/30 dark:bg-neutral-800/30 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                        <CheckCircle size={16} className="text-accent-500" />
                        <span>Project Steps</span>
                      </h4>
                      <div className="space-y-3">
                        {steps.map((stepObj, index: number) => {
                          const stepStatusConfig = getStatusConfig(stepObj.status);
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors duration-300"
                            >
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleStepStatusChange(index)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                  stepObj.status === "completed"
                                    ? "bg-accent-500 border-accent-500 text-white"
                                    : stepObj.status === "in progress"
                                    ? "bg-primary-500 border-primary-500 text-white"
                                    : "border-neutral-400 dark:border-neutral-600 hover:border-primary-500"
                                }`}
                              >
                                {stepObj.status === "completed" && <CheckCircle size={12} />}
                                {stepObj.status === "in progress" && <Clock size={12} />}
                              </motion.button>
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${
                                  stepObj.status === "completed"
                                    ? "line-through text-neutral-600 dark:text-neutral-400"
                                    : stepObj.status === "in progress"
                                    ? "text-primary-500"
                                    : "text-gray-900 dark:text-gray-100"
                                }`}>
                                  {stepObj.stepTitle}
                                </p>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  stepObj.status === "completed"
                                    ? "bg-accent-500/20 text-accent-500"
                                    : stepObj.status === "in progress"
                                    ? "bg-primary-500/20 text-primary-500"
                                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                                }`}>
                                  {stepObj.status}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCommitModal(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl shadow-medium hover:shadow-glow transition-all duration-300 font-medium"
                  >
                    Commit Steps
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Commit Modal */}
            <AnimatePresence>
              {showCommitModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-hard p-6 w-96 max-w-[90vw]"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Commit Changes
                    </h3>
                    <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                      {steps.map((stepObj, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-neutral-100/30 dark:bg-neutral-800/30 rounded-lg">
                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {stepObj.stepTitle}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            stepObj.status === "completed"
                              ? "bg-accent-500/20 text-accent-500"
                              : stepObj.status === "in progress"
                              ? "bg-primary-500/20 text-primary-500"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          }`}>
                            {stepObj.status}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end space-x-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCommitModal(false)}
                        className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-300"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCommit}
                        className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl shadow-medium hover:shadow-glow transition-all duration-300"
                      >
                        Confirm & Commit
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <GithubEvaluation project={project} />
        )}

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${statusConfig.gradient}`} />
        </div>
        <div className="absolute bottom-4 left-4 opacity-5 group-hover:opacity-15 transition-opacity">
          <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${statusConfig.gradient}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
