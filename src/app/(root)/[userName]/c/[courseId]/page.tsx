"use client"
import { getBatchProjectsByCourseId } from "../../../../../components/actions/batch";
import BatchCard from "../../../../../components/batch/card";
import type { Batch, Project } from "../../../../../components/shared/schema/Project"; 
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Loading from "../../../loading";
import CourseShare from "../../../../../components/courses/CourseShare";
import ChallengeCard from "../../../../../components/challenges/ChallengeCard";
import { motion } from "framer-motion";
import { BookOpen, Users, Share2, FolderTree } from "lucide-react";
import Link from "next/link";

interface ChallengeSummary {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  sector?: { id: string; name: string; icon?: string } | null;
  group?: { id: string; name: string } | null;
  _count: { participants: number };
}

interface CourseBatches {
  title: string;
  status?: string;
  batch: Batch[];
  group?: { id: string; name: string } | null;
  __meta?: {
    role?: 'OWNER'|'READ_ONLY'|'SYNC_COPY'|'COPY';
    sector?: { id: string; name: string; icon?: string } | null;
    challenge?: ChallengeSummary | null;
  };
}

export default function Page() {
  const { userName, courseId } = useParams();
  const [Batches, setBatches] = useState<CourseBatches | null>(null);
  const [courseData, setCourseData] = useState<CourseBatches | null>(null);
  const role = Batches?.__meta?.role as ('OWNER'|'READ_ONLY'|'SYNC_COPY'|'COPY'|undefined);
  const [projectName, setProjectName] = useState("");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Detect sidebar expansion state
  useEffect(() => {
    const checkSidebarState = () => {
      const sidebarWidth = getComputedStyle(document.documentElement)
        .getPropertyValue('--sidebar-width')
        .trim();
      // Sidebar is expanded when width is 288px, collapsed when 88px
      const expanded = sidebarWidth === '288px';
      setIsSidebarExpanded(expanded);
    };

    // Check initial state
    checkSidebarState();

    // Use interval to poll for changes (more reliable for CSS variables)
    // Poll every 200ms to balance responsiveness and performance
    const interval = setInterval(checkSidebarState, 200);

    // Also check on resize
    window.addEventListener('resize', checkSidebarState);

    // Create a MutationObserver as backup
    const observer = new MutationObserver(() => {
      // Small delay to ensure CSS variable is updated
      setTimeout(checkSidebarState, 50);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: false,
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
      window.removeEventListener('resize', checkSidebarState);
    };
  }, []);

  useEffect(() => {
    const fetchBatches = async () => {
      const batches = await getBatchProjectsByCourseId(courseId as string);
      setBatches(batches);
      setCourseData(batches);
      setProjectName(batches.title);
      try {
        const res = await fetch('/api/courses/my', { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          const list: Array<{ id: string; __meta?: { ownership?: string } }> = j.data || [];
          const found = list.find((c)=> c.id === (courseId as string));
          const ownership = found?.__meta?.ownership;
          // Only OWNER can edit (COPY creates owned courses, READ_ONLY is read-only)
          setCanEdit(ownership === 'OWNER');
        }
      } catch {}
    };
    fetchBatches();
  }, [userName, courseId]);

  if (!Batches || !Batches.batch || Batches.batch.length === 0) {
    return <Loading/>;
  }

  const challenge = courseData?.__meta?.challenge || null;
  const group = courseData?.group || null;
  const sector = courseData?.__meta?.sector || null;
  const batches = Batches.batch.sort((a: Batch, b: Batch) => (a.number ?? 0) - (b.number ?? 0));

  // Calculate course progress
  const totalProjects = batches.reduce((acc: number, batch: Batch) => acc + (batch.projects?.length || 0), 0);
  const completedProjects = batches.reduce((acc: number, batch: Batch) => 
    acc + (batch.projects?.filter((p: Project) => p.status === 'completed').length || 0), 0);
  const progressPercentage = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Course Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-4 border-slate-200 dark:border-slate-700 p-6 sm:p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Title and Info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 break-words">
                    {projectName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    {/* Group Badge */}
                    {group && (
                      <Link 
                        href={`/groups/${group.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">{group.name}</span>
                      </Link>
                    )}
                    
                    {/* Sector Badge */}
                    {sector && (
                      <Link
                        href={`/sectors/${sector.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                      >
                        <FolderTree className="w-4 h-4" />
                        <span className="text-sm font-medium">{sector.icon} {sector.name}</span>
                      </Link>
                    )}

                    {/* Course Status */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      Batches.status === 'completed' 
                        ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                        : Batches.status === 'in progress'
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      <span className="capitalize">{Batches.status || 'Not Started'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {totalProjects > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Course Progress</span>
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {completedProjects} / {totalProjects} projects ({progressPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 lg:flex-col">
              {role === 'OWNER' && (
                <button
                  onClick={() => setShowShare(!showShare)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share Course</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Share Course Section */}
        {showShare && role === 'OWNER' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-4 border-slate-200 dark:border-slate-700 p-6"
          >
            <CourseShare courseId={courseId as string} />
          </motion.div>
        )}

        {/* Challenge Card */}
        {challenge && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ChallengeCard challenge={challenge} />
          </motion.div>
        )}

        {/* Modules Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-blue-500" />
              <span>Modules</span>
              <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                ({batches.length})
              </span>
            </h2>
          </div>

          <motion.div
            className={`grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
              isSidebarExpanded ? 'xl:grid-cols-3' : 'xl:grid-cols-4'
            }`}
            layout
            transition={{
              layout: {
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1], // Custom easing for smooth transition
              },
            }}
          >
            {batches.map((batch: Batch, index: number) => (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <BatchCard 
                  batch={{...batch}} 
                  activeBatchId={activeBatchId}
                  setActiveBatchId={setActiveBatchId}
                  canEdit={canEdit}
                  courseId={courseId as string}
                  role={role}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
