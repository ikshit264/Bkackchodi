/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import axios from "axios";
import { useUser } from "@clerk/nextjs";
import yaml from "js-yaml";
import { GetProjectByProjectId } from "../actions/project";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { duotoneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

const GithubPart = ({ projectId }) => {
  const { user } = useUser();
  const userId = user?.id;
  const userName = user?.username;

  const [project, setProject] = useState(null);
  const [repoLink, setRepoLink] = useState<string>("");
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codeQL, setCodeQL] = useState(null);
  const [codeQLVisible, setCodeQLVisible] = useState(false);
  const url = `https://github.com/${userName}`;

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await GetProjectByProjectId(projectId);
        const repoLink = response.githubRepo || "";
        setRepoLink(`${url + `/` + repoLink}`);
        setProject(response);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
    fetchProject();
  }, [projectId]);

  if (!project) {
    return <p className="text-gray-600">Loading project...</p>;
  }

  const githubData = project.GithubData
    ? JSON.parse(project.GithubData)
    : evaluationResult;

  const PushToDB = async (githubData) => {
    try {
      const response = await axios.patch("/api/query/project", {
        projectId: project.id,
        updatedFields: { GithubData: githubData },
      });
      if (response.status !== 200) throw new Error("Failed to update DB");
    } catch (error) {
      console.error("Database update error:", error);
    }
  };

  const handleEvaluate = async () => {
    if (!repoLink.trim()) {
      setEvaluationResult({ error: "Please enter a valid GitHub link." });
      return;
    }

    setLoading(true);
    setEvaluationResult(null);

    try {
      const store = repoLink.split("/");
      const indexOfGithub = store.findIndex((m) => m === "github.com");
      if (!store[indexOfGithub + 1] || !store[indexOfGithub + 2]) {
        throw new Error("Invalid GitHub repository link.");
      }

      const response = await fetch("/api/ai/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          owner: store[indexOfGithub + 1],
          repo: store[indexOfGithub + 2],
          topic: project.title,
          learning_objectives: project.learningObjectives,
          steps: project.steps,
        }),
      });

      if (response.status !== 200)
        throw new Error(`Request failed: ${response.status}`);

      const { jsonObject } = await response.json();
      await PushToDB(jsonObject);
      setEvaluationResult(JSON.parse(jsonObject));
    } catch (error) {
      console.error("Evaluation error:", error);
      setEvaluationResult({ error: "Failed to evaluate the repository." });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeQlGenerate = async () => {
    if (!repoLink.trim()) {
      setEvaluationResult({ error: "Please enter a valid GitHub link." });
      return;
    }

    setLoading(true);
    setEvaluationResult(null);

    try {
      const store = repoLink.split("/");
      const indexOfGithub = store.findIndex((m) => m === "github.com");
      if (!store[indexOfGithub + 1] || !store[indexOfGithub + 2]) {
        throw new Error("Invalid GitHub repository link.");
      }

      const response = await axios.get("/api/ai/github/codeql", {
        params: {
          id: userId,
          owner: store[indexOfGithub + 1],
          repo: store[indexOfGithub + 2],
        },
      });

      if (response.status !== 200) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const yamlFormattedCode = yaml.dump(response.data.ymlCode);
      setCodeQL(yamlFormattedCode);
    } catch (error) {
      console.error("CodeQL generation error:", error);
      setCodeQL("Error generating CodeQL data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-lg">
      <h5 className="text-xl font-bold text-gray-800">GitHub Evaluation</h5>

      <div className="space-y-4 bg-gray-100 p-4 rounded-lg">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setCodeQLVisible(!codeQLVisible)}
        >
          <p className="text-gray-700 font-semibold">
            🧠 <strong>CodeQL Analysis</strong>
          </p>
          <span className="text-sm text-blue-600">
            {codeQLVisible ? "▼ Hide" : "▶ Show"}
          </span>
        </div>

        {codeQLVisible && (
          <div className="mt-2">
            {codeQL ? (
              <SyntaxHighlighter
                language="yaml"
                style={duotoneDark}
                customStyle={{
                  borderRadius: "0.5rem",
                  padding: "1rem",
                  fontSize: "0.85rem",
                  maxHeight: "24rem",
                }}
              >
                {codeQL}
              </SyntaxHighlighter>
            ) : (
              <p className="text-gray-400 italic">Not generated yet.</p>
            )}
          </div>
        )}
      </div>

      {githubData && (
        <div className="space-y-4 bg-gray-100 p-4 rounded-lg">
          {githubData && githubData.error ? (
            <p className="text-red-500">{githubData.error}</p>
          ) : (
            <>
              <p className="text-gray-700">
                🎯 <strong>Objectives Met:</strong> {githubData["Objectives Met"]}
              </p>
              <div>
                <h6 className="font-semibold text-red-600">⚠️ Critical Issues:</h6>
                <ul className="list-disc pl-5 text-gray-700">
                  {githubData["Critical Issues"]?.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h6 className="font-semibold text-green-600">💡 Suggestions:</h6>
                <ul className="list-disc pl-5 text-gray-700">
                  {githubData["Suggestions"]?.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
              <p className="text-lg font-bold text-black">
                🏆 Final Score: {githubData["Final Score"]} / 100
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleEvaluate}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 ${
            loading ? "bg-gray-400" : "bg-green-600"
          } text-white rounded-lg hover:bg-green-700 transition-all`}
        >
          <Play size={16} /> {loading ? "Evaluating..." : "Evaluate"}
        </button>
        <button
          onClick={handleCodeQlGenerate}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 ${
            loading ? "bg-gray-400" : "bg-green-600"
          } text-white rounded-lg hover:bg-green-700 transition-all`}
        >
          <Play size={16} /> {loading ? "Generating..." : "Generate"}
        </button>
      </div>
    </div>
  );
};

export default GithubPart;
