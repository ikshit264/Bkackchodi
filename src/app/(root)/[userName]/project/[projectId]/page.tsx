"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GetProjectByProjectId } from "../../../../../components/actions/project";
import ProjectPage from "../../../../../components/projects/Projectage";
import Loading from "../../../loading";

const ProjectDetailsPage = () => {
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'OWNER'|'READ_ONLY'|'SYNC_COPY'|'COPY'|null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const params = useParams();
  const projectId = params.projectId as string;

  useEffect(() => {
    const fetchProject = async () => {
      if (projectId) {
        try {
          const projectData = await GetProjectByProjectId(projectId);
          setProject(projectData);
          // Determine my role for this project's course
          try {
            const res = await fetch('/api/courses/my', { cache: 'no-store' });
            const j = await res.json();
            const list: Array<{ id: string; __meta?: { ownership?: 'OWNER'|'READ_ONLY'|'SYNC_COPY'|'COPY'|null; accessLevel?: 'SYNC_COPY'|'COPY' } }> = j.data || [];
            const courseIdValue = projectData?.batch?.course?.id;
            const batchIdValue = projectData?.batch?.id;
            setCourseId(courseIdValue);
            setBatchId(batchIdValue);
            const found = list.find((c)=> c.id === courseIdValue);
            const ownership = found?.__meta?.ownership || null;
            // Check if it's SYNC_COPY or COPY access
            const accessLevel = found?.__meta?.accessLevel;
            if (accessLevel === 'SYNC_COPY') {
              setRole('SYNC_COPY');
            } else if (accessLevel === 'COPY') {
              setRole('COPY');
            } else {
              setRole(ownership);
            }
            console.log('Project access role:', ownership, 'accessLevel:', accessLevel);
          } catch {}
        } catch (error) {
          console.error("Error fetching project:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return <Loading />;
  }

  if (!project) {
    return (
      <div className="text-center text-red-500 text-lg">Project not found</div>
    );
  }

  return (
    <div className="">
      <ProjectPage 
        params={{ id: projectId }} 
        role={role}
        courseId={courseId}
        batchId={batchId}
      />
    </div>
  );
};

export default ProjectDetailsPage;
