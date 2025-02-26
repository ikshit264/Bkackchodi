import { Play, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import GithubEvaluation from "./GithubEvaluation";

interface ProjectCardProps {
  project: any;
  onStartProject: (projectId: string) => void;
}

const ProjectCard = ({ project, onStartProject }: ProjectCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("projects");

  const getProjectStatus = (steps: any[]) => {
    if (!steps || steps.length === 0) return "Not Started";
    return steps.every((s) => s.status === "completed")
      ? "Completed"
      : "In Progress";
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Function to handle step status change
  const handleStepStatusChange = (stepIndex: number) => {
    const updatedSteps = project.steps.map((stepObj: any, index: number) => {
      if (index === stepIndex) {
        return {
          ...stepObj,
          status: stepObj.status === "completed" ? "in progress" : "completed",
        };
      }
      return stepObj;
    });

    console.log(updatedSteps)
    project.steps = updatedSteps;
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm relative">
      {/* Sub-navbar */}
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => handleTabChange("projects")}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === "projects"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Projects
        </button>
        <button
          onClick={() => handleTabChange("github")}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === "github"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          GitHub Evaluation
        </button>
      </div>

      {/* Conditional Rendering */}
      {activeTab === "projects" ? (
        <>
          {/* Start Project Button */}
          {!project.steps || project.steps.length === 0 ? (
            <button
              onClick={() => onStartProject(project.id)}
              className="absolute -top-3 -right-3 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <Play size={16} /> Start Now
            </button>
          ) : (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="absolute -top-3 -right-3 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              {/* Expand/Collapse Button */}
              {isExpanded ? "Show Less" : "Show More"}{" "}
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            // <p
            //   className={`text-sm ${
            //     getProjectStatus(project.steps) === 'Completed' ? 'text-green-600' : 'text-yellow-500'
            //   }`}
            // >
            //   Status: {getProjectStatus(project.steps)}
            // </p>
          )}

          {/* Title and Description */}
          <div className="space-y-2">
            <h5 className="text-lg font-semibold text-black">
              {project.title}
            </h5>
            <p className="text-gray-600">{project.description}</p>
          </div>

          {/* Expandable Content */}
          {isExpanded && (
            <div className="space-y-2 mt-2">
              {/* Learning Objectives */}
              <div className="text-black">
                <h6 className="font-semibold text-gray-700">
                  Learning Objectives:
                </h6>
                <ul className="list-disc list-inside space-y-1">
                  {project.learningObjectives.map(
                    (objective: string, index: number) => (
                      <li key={index}>- {objective}</li>
                    )
                  )}
                </ul>
              </div>

              {/* Steps */}
              {project.steps && project.steps.length > 0 && (
                <div className="space-y-2">
                  <h6 className="text-md font-semibold text-gray-700">
                    Steps:
                  </h6>
                  <ul className="list-inside space-y-1">
                    {project.steps.map((stepObj: any, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        {/* Circular Checkbox */}
                        <input
                          type="checkbox"
                          checked={stepObj.status === "completed"}
                          onChange={() => handleStepStatusChange(index)}
                          className="appearance-none w-4 h-4 border border-gray-400 rounded-full checked:bg-green-600 checked:border-green-600 cursor-pointer"
                        />

                        {/* Step Title with Strikethrough */}
                        <div>
                          <span
                            className={`text-sm ${
                              stepObj.status === "completed"
                                ? "line-through text-green-600"
                                : stepObj.status === "in progress"
                                ? "text-yellow-500"
                                : "text-gray-700"
                            }`}
                          >
                            {stepObj.step.stepTitle} -{" "}
                            <span className="italic">{stepObj.status}</span>
                          </span>

                          {/* Resources */}
                          <ul className="ml-10 space-y-1">
                            {stepObj.step.resources.map(
                              (resource: any, resourceIndex: number) => (
                                <li key={resourceIndex}>
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                  >
                                    {resource.title}
                                  </a>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <GithubEvaluation project={project}/> // Render the GitHubEvaluation component
      )}
    </div>
  );
};

export default ProjectCard;
