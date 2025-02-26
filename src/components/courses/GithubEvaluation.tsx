"use client";

import { useState } from "react";
import { Play } from "lucide-react";

const GithubEvaluation = ({ project }) => {
  const [repoLink, setRepoLink] = useState("");
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    if (repoLink.trim() === "") {
      setEvaluationResult({ error: "Please enter a valid GitHub link." });
      return;
    }

    setLoading(true);
    setEvaluationResult(null);

    const store = repoLink.split("/");
    const indexOfGithub = store.findIndex((m) => m === "github.com");

    try {
      const response = await fetch("/api/ai/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: store[indexOfGithub + 1],
          repo: store[indexOfGithub + 2],
          topic: project.title,
          learning_objectives: project.learning_objectives,
          steps: project.steps,
        }),
      });

      const { jsonObject } = await response.json();
      setEvaluationResult(JSON.parse(jsonObject));
    } catch (error) {
      setEvaluationResult({ error: "Failed to evaluate the repository." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-lg">
      <h5 className="text-xl font-bold text-gray-800">GitHub Evaluation</h5>

      <input
        type="text"
        placeholder="Enter GitHub Repo Link"
        value={repoLink}
        onChange={(e) => setRepoLink(e.target.value)}
        className="w-full text-black p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        onClick={handleEvaluate}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 ${
          loading ? "bg-gray-400" : "bg-green-600"
        } text-white rounded-lg hover:bg-green-700 transition-all`}
      >
        <Play size={16} /> {loading ? "Evaluating..." : "Evaluate"}
      </button>
      <div>
        <h6 className="text-lg font-semibold text-black">📌 Project: {project.title}</h6>
      </div>
      {/* Evaluation Results */}
      {evaluationResult && (
        <div className="space-y-4 bg-gray-100 p-4 rounded-lg">
          {evaluationResult.error ? (
            <p className="text-red-500">{evaluationResult.error}</p>
          ) : (
            <>
              <p className="text-gray-700">
                🎯 <strong>Objectives Met:</strong>{" "}
                {evaluationResult["Objectives Met"]}
              </p>

              <div>
                <h6 className="font-semibold text-red-600">
                  ⚠️ Critical Issues:
                </h6>
                <ul className="list-disc pl-5 text-gray-700">
                  {evaluationResult["Critical Issues"]?.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h6 className="font-semibold text-green-600">
                  💡 Suggestions:
                </h6>
                <ul className="list-disc pl-5 text-gray-700">
                  {evaluationResult["Suggestions"]?.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>

              <p className="text-lg font-bold text-black">
                🏆 Final Score: {evaluationResult["Final Score"]} / 100
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GithubEvaluation;
