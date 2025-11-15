"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import CourseCard from "../../../../components/course/card";
import Link from "next/link";
import { GetCoursesByName } from "../../../../components/actions/course";
import { GetUserByUserId } from "../../../../components/actions/user";
import Loading from "../../loading";

interface CourseListItem {
  id: string;
  title: string;
  status?: string;
  group?: { name?: string } | null;
  createdAt?: string;
  __meta?: {
    ownerUserName?: string;
    ownership?: "OWNER" | "READ_ONLY" | "COPY" | "SYNC_COPY";
    challenge?: {
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
    } | null;
  };
}

const CoursesPage = () => {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const userName = params.userName as string;
  const { user, isLoaded } = useUser();
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

  

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        // If viewing own page, include shared courses via API
        if (user && user.username === userName) {
          const res = await fetch('/api/courses/my', { cache: 'no-store' });
          if (res.ok) {
            const j = await res.json();
            setCourses(j.data || []);
          } else {
            const fetchedCourses = await GetCoursesByName(userName);
            setCourses(fetchedCourses);
          }
        } else {
          const fetchedCourses = await GetCoursesByName(userName);
          setCourses(fetchedCourses);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [userName, user]);

  if (loading && !courses.length) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen p-6">
      {/* Content */}
      <div className="max-w-7xl mx-auto">
        <>
          {loading && <Loading />}
          {!loading && (!courses || courses.length === 0) && (
            <div className="text-center text-red-500 text-lg">
              Courses not found
            </div>
          )}
          {!loading && courses && courses.length > 0 && (() => {
              // Check if we're viewing own page (has __meta) or someone else's page
              const isOwnPage = courses.some((course) => course.__meta);
              
              // If viewing someone else's page, show all courses normally
              if (!isOwnPage) {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {courses.map((course) => {
                      const ownerUserName = course.__meta?.ownerUserName || userName;
                      return (
                        <Link key={course.id} href={`/${ownerUserName}/c/${course.id}`}>
                          <CourseCard
                            title={course.title}
                            status={course.status}
                            Id={course.id}
                            groupName={course.group?.name}
                            ownership={course.__meta?.ownership}
                            ownerUserName={course.__meta?.ownerUserName}
                            challenge={course.__meta?.challenge || null}
                          />
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              // If viewing own page, show all courses in a single unified list
              // Sort courses: owned first, then by creation date
              const sortedCourses = [...courses].sort((a, b) => {
                // Owned courses first
                const aIsOwner = a.__meta?.ownership === "OWNER";
                const bIsOwner = b.__meta?.ownership === "OWNER";
                if (aIsOwner && !bIsOwner) return -1;
                if (!aIsOwner && bIsOwner) return 1;
                // Then by creation date (newest first)
                const aDate = new Date(a.createdAt || 0).getTime();
                const bDate = new Date(b.createdAt || 0).getTime();
                return bDate - aDate;
              });

              return (
                <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    All Courses
                      </h2>
                  {sortedCourses.length === 0 ? (
                    <div className="text-center text-red-500 text-lg">
                      Courses not found
                    </div>
                  ) : (
                    <motion.div
                      className={`grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
                        isSidebarExpanded ? 'xl:grid-cols-3' : 'xl:grid-cols-4'
                      }`}
                      layout
                      transition={{
                        layout: {
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1],
                        },
                      }}
                    >
                      {sortedCourses.map((course, index) => {
                          const ownerUserName = course.__meta?.ownerUserName || userName;
                          return (
                          <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            layout
                          >
                            <Link href={`/${ownerUserName}/c/${course.id}`}>
                              <CourseCard
                                title={course.title}
                                status={course.status}
                                Id={course.id}
                                groupName={course.group?.name}
                                ownership={course.__meta?.ownership}
                                ownerUserName={course.__meta?.ownerUserName}
                                challenge={course.__meta?.challenge || null}
                              />
                            </Link>
                          </motion.div>
                          );
                        })}
                    </motion.div>
                  )}
                    </div>
              );
            })()}
        </>
      </div>
    </div>
  );
};

export default CoursesPage;
