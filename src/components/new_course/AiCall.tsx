"use client";

import React, { useState } from "react";
import axios from "axios";
import { MultiStepLoader } from "../ui/multi-step-loader";
import { test } from "../../outputs/test";
import { validateJsonStructure } from "../../utils/JsonChecker";

interface Project {
  batch: number;
  title: string;
  description: string;
  level: string;
  status: string;
  learningObjectives: Record<string, string>;
  steps: Record<string, string>;
}

interface Batch {
  batchId: number;
  projects: Project[];
}

interface CourseData {
  title: string;
  description: string;
  batches: Batch[];
}

const AiCall = ({
  onOutputChange,
  onMetadataChange,
}: {
  onOutputChange: (data: Batch[]) => void;
  onMetadataChange: (data: any) => void;
}) => {
  const [prompt, setPrompt] = useState("");
  const [timeDuration, setTimeDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [conditionalVariable, setConditionalVariable] = useState(false);
  const [error, setError] = useState("");

  const loadingStates = [
    { text: "Initializing AI model..." },
    { text: "Processing your prompt..." },
    { text: "Analyzing time duration..." },
    { text: "Generating response..." },
    { text: "Formatting output..." },
    { text: "Verifying data integrity..." },
    { text: "Complete!" },
  ];

  const handleComplete = () => {
    setLoading(false);
    setConditionalVariable(false);
  };

  function filterByBatches(projects: Project[]): Batch[] {
    const batches: Record<number, Batch> = {};

    projects.forEach((project) => {
      const batchId = project.batch-1;
      if (!batches[batchId]) {
        batches[batchId] = {
          batchId,
          projects: [],
        };
      }
      batches[batchId].projects.push(project);
    });

    return Object.values(batches);
  }

  const uploadCourse = async (
    title: string,
    description: string,
    batches: Batch[]
  ) => {
    try {
      const response = await axios.post("/api/query/courseandprojects", {
        title,
        description,
        batches,
      });

      if (response.status === 201) {
        console.log("Course uploaded successfully!", response.data);
      } else {
        const jsondata = await response.data;
        setError(jsondata.message ??  jsondata.error);
      }
    } catch (err) {
      console.error("Error uploading course:", err);
    }
  };

  const processData = async () => {
    setLoading(true);
    setError("");

    try {
      // const response = await axios.post("/api/ai", {
      //   topic: prompt,
      //   time_duration: timeDuration,
      // });
      const jsonObject = JSON.parse(JSON.stringify(test.projects));
      // await new Promise((resolve) => setTimeout(resolve, 5000)); // Mocking delay

      const checkJson = validateJsonStructure(jsonObject);

      if (checkJson.valid) {
        setConditionalVariable(true);

        const sortedJson = filterByBatches(jsonObject);
        onOutputChange(sortedJson);
        onMetadataChange(test.METADATA);

        // Send to backend
        await uploadCourse(test.METADATA.topic, test.METADATA.generalTip, sortedJson);
      } else {
        setError(checkJson.error);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error processing data:", err);
      setError("An error occurred while processing your request.");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !timeDuration) {
      setError("Please fill in both fields.");
      return;
    }
    processData();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          placeholder="Enter your topic..."
          className="border p-2 rounded-md w-full text-black"
        />
        <input
          type="text"
          value={timeDuration}
          onChange={(e) => setTimeDuration(e.target.value)}
          disabled={loading}
          placeholder="Enter time duration..."
          className="border p-2 rounded-md w-full text-black"
        />
        {error && <div className="text-red-500 text-lg py-2">{error}</div>}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md active:bg-blue-700 w-full"
          disabled={loading}
        >
          {loading ? "Processing..." : "Send"}
        </button>
      </form>

      {/* <MultiStepLoader
        loadingStates={loadingStates}
        loading={loading}
        conditionalVariable={conditionalVariable}
        onComplete={handleComplete}
      /> */}
    </div>
  );
};

export default AiCall;
