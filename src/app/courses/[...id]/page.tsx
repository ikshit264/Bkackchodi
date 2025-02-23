"use client";

import axios from "axios";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import CourseHeader from "../../../components/courses/CourseHeader";
import BatchList from "../../../components/courses/BatchList";

const Page = () => {
  const params = useParams<{ id: string }>();
  const { id } = params;

  const [errors, setErrors] = useState("");
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState(null);

  const getCourse = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/query/courseandprojects/${id}`);
      if (response.status !== 200) {
        throw new Error("Failed to fetch course. Please try again later.");
      }
      return { status: "success", data: response.data.data };
    } catch (err: any) {
      console.error("Error fetching course:", err.message);
      return { status: "error", error: err.message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      const project = updatedCourse.batches
        .flatMap((batch) => batch.projects)
        .find((p) => p.id === projectId);

      if (!project) throw new Error("Project not found.");

      const response = await axios.post("/api/ai/project", {
        topic: project.title,
        learning_objectives: project.learningObjectives,
      });

      if (response.status === 200) {
        const parsedData = JSON.parse(response.data.jsonObject || "{}");
        project.steps = (parsedData?.Steps || []).map((step) => ({
          step,
          status: "pending",
        }));

        await axios.patch("/api/query/project", {
          projectId,
          updatedFields: { steps: project.steps },
        });

        setCourse(updatedCourse);
      }
    } catch (error: any) {
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