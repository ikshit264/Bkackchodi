"use client";

import axios from "axios";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Play } from "lucide-react";

const Page = () => {
  const params = useParams<{ id: string }>();
  const { id } = params;

  const [errors, setErrors] = useState("");
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [completedProjects, setCompletedProjects] = useState<string[]>([]);

  const getCourse = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/query/courseandprojects/${id}`);
      if (response.status !== 200) {
        throw new Error("Failed to fetch course. Please try again.");
      }
      return { status: "success", data: response.data.data, error: "" };
    } catch (err: any) {
      console.error("Error fetching course:", err.message);
      return { status: "error", data: null, error: err.message };
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

  const handleCompleteProject = (projectId: string) => {
    setCompletedProjects((prev) => [...prev, projectId]);
  };

  const isProjectUnlocked = (batchProjects: any[], currentIndex: number) => {
    if (currentIndex === 0) return true;
    return completedProjects.includes(batchProjects[currentIndex - 1].id);
  };

  if (loading) return <div>Loading...</div>;
  if (errors) return <div>Error: {errors}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Course ID: {id}</h1>
      {course ? (
        <div className="border rounded-xl p-6 shadow-2xl bg-white">
          <h2 className="text-2xl font-semibold text-blue-700">{course.title}</h2>
          <p className="text-gray-500 mt-1">
            Created At: {new Date(course.createdAt).toLocaleDateString()}
          </p>
          {/* Batches Section */}
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-4 text-gray-700">Batches</h3>
            {course.batches && course.batches.length > 0 ? (
              course.batches.map((batch) => (
                <div
                  key={batch.id}
                  className="border rounded-lg p-4 mb-4 shadow hover:shadow-md transition bg-gray-50"
                >
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => toggleBatch(batch.id)}
                  >
                    <h4 className="font-semibold text-lg text-gray-800">
                      Batch Number: {batch.number}
                    </h4>
                    {expandedBatch === batch.id ? (
                      <ChevronDown className="text-blue-500" />
                    ) : (
                      <ChevronRight className="text-blue-500" />
                    )}
                  </div>

                  {expandedBatch === batch.id && (
                    <div className="mt-3 space-y-3">
                      {batch.projects && batch.projects.length > 0 ? (
                        batch.projects.map((project, index) => (
                          <div
                            key={project.id}
                            className={`p-4 border rounded-lg bg-white shadow-sm flex flex-col gap-2 ${
                              completedProjects.includes(project.id)
                                ? "opacity-50"
                                : ""
                            }`}
                          >
                            <h5 className="text-lg font-semibold">
                              {project.title}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {project.description}
                            </p>
                            <p className="text-sm text-blue-500">
                              Level: {project.level}
                            </p>
                            <p className="text-sm text-green-600">
                              Status: {completedProjects.includes(project.id) ? "Completed" : "Pending"}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-2">
                              <button
                                disabled={!isProjectUnlocked(batch.projects, index)}
                                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 transition duration-200 ${
                                  isProjectUnlocked(batch.projects, index)
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                              >
                                <Play size={16} /> Start Now
                              </button>
                              <button
                                onClick={() => handleCompleteProject(project.id)}
                                disabled={!completedProjects.includes(project.id)}
                                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 transition duration-200 ${
                                  completedProjects.includes(project.id)
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-green-500 hover:text-white"
                                }`}
                              >
                                <CheckCircle size={16} /> Mark as Completed
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500">No projects found.</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No batches found for this course.</p>
            )}
          </div>
        </div>
      ) : (
        <p>No course found.</p>
      )}
    </div>
  );
};

export default Page;
