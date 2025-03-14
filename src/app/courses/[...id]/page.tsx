"use client";

import axios from "axios";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import CourseHeader from "../../../components/courses/CourseHeader";
import BatchList from "../../../components/courses/BatchList";
import { CreateIssue } from "../../../components/courses/GithubFunctions";
import { UserId as fetchUserId } from "../../../utils/userId";

const Page = () => {
  const params = useParams<{ id: string }>();
  const { id } = params;
    const userId = fetchUserId();
  
  const [errors, setErrors] = useState("");
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState(null);

  useEffect(() => {
    const getCourse = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/query/courseandprojects/${id}`);
        if (response.status !== 200) {
          throw new Error("Failed to fetch course. Please try again later.");
        }
        return { status: "success", data: response.data.data };
      } catch (err) { //kuch na lagu
        console.error("Error fetching course:", err.message);
        return { status: "error", error: err.message };
      } finally {
        setLoading(false);
      }
    };
    
    const fetchCourse = async () => {
      const result = await getCourse();
      if (result.status === "success") {
        setCourse(result.data);
      } else {
        setErrors(result.error);
      }
    };
    fetchCourse();
  }, [id]);

  const toggleBatch = (batchId: string) => {
    setExpandedBatch(expandedBatch === batchId ? null : batchId);
  };

  const handleStartProject = async (projectId: string) => {
    try {
      const updatedCourse = { ...course };
  
      // Find the project and its batch
      let targetProject = null;
      let batchId = null;
  
      for (const batch of updatedCourse.batches) {
        const project = batch.projects.find((p) => p.id === projectId);
        if (project) {
          targetProject = project;
          batchId = batch.id;
          break;
        }
      }
  
      if (!targetProject) throw new Error("Project not found.");
  
      const response = await axios.post("/api/ai/project", {
        topic: targetProject.title,
        learning_objectives: targetProject.learningObjectives,
      });
  
      if (response.status !== 200) throw new Error("Failed to fetch project data.");
  
      const parsedData = JSON.parse(response.data.jsonObject || "{}");
      const steps = (parsedData?.Steps || []).map((step, index) => ({
        index,
        step,
        status: "pending",
        issueId: null, // Placeholder for issueId
      }));
  
      // Call CreateIssue and receive updated steps with issueIds
      const updatedSteps = await CreateIssue(
        "ikshit004",    // owner
        "Testing",        // repoName
        "user",         // ownerType
        projectId,      // BatchProjectId
        targetProject.title, // projectTitle
        batchId,        // batchId
        userId,         // userId
        steps           // steps
      );

      console.log("updated Steps", updatedSteps);
  
// **Map back the issueId to their respective steps**
parsedData.Steps = parsedData.Steps.map((step, index) => ({
  ...step,
  issueId: updatedSteps[index]?.issueId || null, // Assign issueId from updated steps
  itemId : updatedSteps[index]?.itemId || null,
  status: "pending",
}));

  
      // **Update the project with updated steps**
      await axios.patch("/api/query/project", {
        projectId,
        updatedFields: { steps: parsedData.Steps },
      });
  
      setCourse(updatedCourse);
    } catch (error) {
      console.error("Error starting project:", error);
    }
  };
  
  

  if (loading) return <div>Loading...</div>;
  if (errors) return <div className="text-red-500">Error: {errors}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <CourseHeader id={id} title={course?.title} createdAt={course?.createdAt} />
      {course ? (
        <div className="border rounded-xl p-6 shadow-2xl bg-white">
          <BatchList
            batches={course.batches}
            expandedBatch={expandedBatch}
            onBatchToggle={toggleBatch}
            onStartProject={handleStartProject}
          />
        </div>
      ) : (
        <p>No course found.</p>
      )}
    </div>
  );
};

export default Page;