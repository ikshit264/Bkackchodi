"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Loading from "../../(root)/loading";

interface Group {
  id: string;
  name: string;
  type: string;
}

interface Course {
  id: string;
  title: string;
  batch?: Array<{
    id: string;
    number: number;
    projects?: Array<{
      id: string;
      title: string;
      batchId: string;
    }>;
  }>;
}

interface Project {
  id: string;
  title: string;
  batchId: string;
  courseId: string;
  courseTitle: string;
}

interface User {
  id: string;
  userName: string;
  name: string;
  lastName: string;
}

const CreateChallengePage = () => {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("TIME_LIMITED");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  
  // Targeting
  const [targetType, setTargetType] = useState<"group" | "users" | "none">("none");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Content
  const [contentType, setContentType] = useState<"course" | "project" | "none">("none");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  
  // Criteria
  const [pointsRequired, setPointsRequired] = useState("");
  const [projectsCompleted, setProjectsCompleted] = useState("");
  const [coursesCompleted, setCoursesCompleted] = useState("");
  
  // Data
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch user's personal groups (CUSTOM type, not CATEGORY/sectors)
        const groupsRes = await fetch("/api/groups/my");
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          // Filter to only show CUSTOM groups (personal groups, not sectors)
          const personalGroups = (groupsData.data || []).filter(
            (group: Group) => group.type === "CUSTOM"
          );
          setGroups(personalGroups);
        }

        // Fetch user's courses (owned + cloned) with batch and projects
        const coursesRes = await fetch("/api/courses/my");
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          // The API returns a flat array of all courses (owned + shared)
          const allCoursesData = coursesData.data || [];
          
          // Fetch full course details with batch and projects for each course
          const coursesWithDetails: Course[] = [];
          const allProjects: Project[] = [];
          
          // Fetch all courses in parallel
          const courseDetailPromises = allCoursesData.map(async (course: { id: string; title: string }) => {
            try {
              const courseDetailRes = await fetch(`/api/query/course/${course.id}`);
              if (courseDetailRes.ok) {
                const courseDetail = await courseDetailRes.json();
                if (courseDetail.data && !courseDetail.data.isDeleted) {
                  return courseDetail.data;
                }
              }
            } catch (error) {
              console.error(`Error fetching course ${course.id} details:`, error);
            }
            return null;
          });
          
          const courseDetails = await Promise.all(courseDetailPromises);
          
          courseDetails.forEach((courseDetail) => {
            if (courseDetail) {
              coursesWithDetails.push(courseDetail);
              
              // Extract projects from this course
              if (courseDetail.batch) {
                courseDetail.batch.forEach((batch: { id: string; number: number; projects?: Array<{ id: string; title: string }> }) => {
                  if (batch.projects) {
                    batch.projects.forEach((project: { id: string; title: string }) => {
                      allProjects.push({
                        id: project.id,
                        title: project.title,
                        batchId: batch.id,
                        courseId: courseDetail.id,
                        courseTitle: courseDetail.title,
                      });
                    });
                  }
                });
              }
            }
          });
          
          setCourses(coursesWithDetails);
          setProjects(allProjects);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleUserSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setUsers([]);
      return;
    }

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const criteria: Record<string, number> = {};
      if (pointsRequired) criteria.pointsRequired = parseInt(pointsRequired);
      if (projectsCompleted) criteria.projectsCompleted = parseInt(projectsCompleted);
      if (coursesCompleted) criteria.coursesCompleted = parseInt(coursesCompleted);

      const body: Record<string, unknown> = {
        name,
        description,
        type,
        criteria,
        startDate: startDate || null,
        endDate: endDate || null,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      };

      // Targeting
      if (targetType === "group") {
        body.groupId = selectedGroupId;
      } else if (targetType === "users") {
        body.userIds = selectedUserIds;
      }

      // Content
      if (contentType === "course") {
        body.courseId = selectedCourseId;
      } else if (contentType === "project") {
        body.projectId = selectedProjectId;
      }

      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        // Check if it's a request (for group members)
        if (data.data.request) {
          alert(data.data.message || "Challenge request created! Waiting for owner/admin approval.");
          router.push("/challenges");
        } else {
          // Direct challenge creation (for owners/admins)
          router.push(`/challenges/${data.data.id}`);
        }
      } else {
        alert(data.error || "Failed to create challenge");
      }
    } catch (error) {
      console.error("Error creating challenge:", error);
      alert("Failed to create challenge");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gradient-to-br p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Create Challenge</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Challenge Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Challenge Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="TIME_LIMITED">Time Limited</option>
                  <option value="SKILL_BASED">Skill Based</option>
                  <option value="GROUP">Group Challenge</option>
                  <option value="STREAK">Streak Challenge</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Timeline</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white mb-2">Start Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2">End Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Who Can Participate?</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Target Type</label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value as "group" | "users" | "none");
                    setSelectedGroupId("");
                    setSelectedUserIds([]);
                  }}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="none">No specific target (manual invites later)</option>
                  <option value="group">My Group</option>
                  <option value="users">Specific Users</option>
                </select>
              </div>

              {targetType === "group" && (
                <div>
                  <label className="block text-white mb-2">Select Group</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    required
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "users" && (
                <div>
                  <label className="block text-white mb-2">Search Users</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    placeholder="Search by username or name..."
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-2"
                  />
                  
                  {users.length > 0 && (
                    <div className="bg-gray-700 rounded border border-gray-600 max-h-40 overflow-y-auto">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            if (!selectedUserIds.includes(u.id)) {
                              setSelectedUserIds([...selectedUserIds, u.id]);
                            }
                          }}
                          className="p-2 hover:bg-gray-600 cursor-pointer text-white"
                        >
                          {u.userName} - {u.name} {u.lastName}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedUserIds.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-white mb-2">Selected Users:</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedUserIds.map((userId) => {
                          const user = users.find((u) => u.id === userId);
                          return (
                            <span
                              key={userId}
                              className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-2"
                            >
                              {user?.userName || userId}
                              <button
                                type="button"
                                onClick={() => setSelectedUserIds(selectedUserIds.filter((id) => id !== userId))}
                                className="text-red-300 hover:text-red-100"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Attach Content (Optional)</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e) => {
                    setContentType(e.target.value as "course" | "project" | "none");
                    setSelectedCourseId("");
                    setSelectedProjectId("");
                    setFilteredProjects([]);
                  }}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="none">No content attached</option>
                  <option value="course">Attach Course</option>
                  <option value="project">Attach Project</option>
                </select>
              </div>

              {contentType === "course" && (
                <div>
                  <label className="block text-white mb-2">Select Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    required
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {contentType === "project" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white mb-2">Select Course First</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        setSelectedProjectId(""); // Reset project when course changes
                        // Filter projects by selected course
                        if (e.target.value) {
                          const courseProjects = projects.filter(
                            (p) => p.courseId === e.target.value
                          );
                          setFilteredProjects(courseProjects);
                        } else {
                          setFilteredProjects([]);
                        }
                      }}
                      required
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCourseId && (
                    <div>
                      <label className="block text-white mb-2">Select Project</label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        required
                        className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select a project</option>
                        {filteredProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Criteria */}
          <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Winning Criteria</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Points Required (Optional)</label>
                <input
                  type="number"
                  value={pointsRequired}
                  onChange={(e) => setPointsRequired(e.target.value)}
                  min="0"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Points are calculated from AI evaluation scores (project: max 100, course: sum of all projects)
                </p>
              </div>

              <div>
                <label className="block text-white mb-2">Projects Completed (Optional)</label>
                <input
                  type="number"
                  value={projectsCompleted}
                  onChange={(e) => setProjectsCompleted(e.target.value)}
                  min="0"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Courses Completed (Optional)</label>
                <input
                  type="number"
                  value={coursesCompleted}
                  onChange={(e) => setCoursesCompleted(e.target.value)}
                  min="0"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Max Participants */}
          <div className="bg-gray-800 rounded-lg p-6 border-4 border-slate-700">
            <label className="block text-white mb-2">Max Participants (Optional)</label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              min="1"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Challenge"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChallengePage;

