"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHome, FaRobot } from "react-icons/fa";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { AiOutlinePlusCircle, AiOutlineProfile } from "react-icons/ai";
import { Sparkles, RefreshCw, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useUser } from "@clerk/nextjs";
import { GetUserByUserId } from "../actions/user";
  
type Course = {
  id: string;
  title: string;
  status?: string;
};

const Sidenav = () => {
  const { user, isLoaded } = useUser();
  const [username, setUsername] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load username from Clerk -> app DB
  useEffect(() => {
    if (!isLoaded) return;

    const fetchUsername = async () => {
      try {
        if (!user) {
          setUsername(null);
          return;
        }
        const fetched = await GetUserByUserId(user.id);
        const name = fetched.userName;
        setUsername(name ?? null);
      } catch (err) {
        console.error("Error fetching username:", (err as Error).message);
        setUsername(null);
      }
    };

    fetchUsername();
  }, [user, isLoaded]);

  const menuItems = [
    {
      icon: AiOutlineProfile,
      label: "Courses",
      gradient: "from-accent-500 to-accent-600",
      href: username ? `/${username}/c` : "/profile",
    },
    {
      icon: AiOutlineProfile,
      label: "Courses",
      expandable: true,
      gradient: "from-secondary-500 to-secondary-600",
    },
    {
      icon: AiOutlinePlusCircle,
      label: "New Course",
      href: username ? `/${username}/new_course` : "/new_course",
      gradient: "from-accent-500 to-accent-600",
    },
    {
      icon: FaHome,
      label: username ?? "Home",
      href: username ? `/${username}/profile` : "/",
      gradient: "from-primary-500 to-primary-600",
    },
  ];

  const getCourses = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get("/api/query/course");

      const payload =
        typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;

      const data: Course[] = Array.isArray(payload?.data) ? payload.data : [];

      setCourses(data);
    } catch (err) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message ||
        (err as Error).message ||
        "Failed to fetch courses";
      console.error("Error fetching courses:", message);
      setError(message);
      setCourses([]);
    } finally {
      setLoading(false);
      setIsCoursesExpanded(true);
    }
  };

  useEffect(() => {
    getCourses();
  }, []);

  // Reflect sidebar width as a CSS variable for layout padding
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-width", isExpanded ? "288px" : "88px");
    return () => {
      root.style.removeProperty("--sidebar-width");
    };
  }, [isExpanded]);

  useEffect(() => {
    // Only respond to mouse movement if not locked
    if (isLocked) return;

    const handleMouseMove = (event: MouseEvent) => {
      const mouseX = event.clientX;
      if (mouseX < 100 && !isHovered) {
        setIsExpanded(true);
      } else if (mouseX > 280 && !isHovered) {
        setIsExpanded(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isHovered, isLocked]);

  const toggleLock = () => {
    setIsLocked(!isLocked);
    if (!isLocked) {
      setIsExpanded(true);
    }
  };

  if (loading || !username) return null;

  return (
    <motion.nav
      initial={{ x: -300 }}
      animate={{
        x: 0,
        width: isExpanded ? 288 : 100, // 72 * 4 = 288px, 22 * 4 = 88px
      }}
      transition={{
        x: { duration: 0.5, ease: "easeOut" },
        width: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
      }}
      onMouseEnter={() => {
        if (!isLocked) {
          setIsHovered(true);
          setIsExpanded(true);
        }
      }}
      onMouseLeave={() => {
        if (!isLocked) {
          setIsHovered(false);
          setIsExpanded(false);
        }
      }}
      className="fixed z-[999] left-0 top-0 h-full glass-dark"
    >
      <div className="flex flex-col h-full py-6">
        {/* Logo Section with Lock Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-6 mb-8"
        >
          <div className="flex items-center ml-1 space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-glow">
              <FaRobot className="w-full text-white" />
            </div>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex-1 overflow-hidden"
                >
                  <h1 className="text-xl font-display font-bold text-gradient whitespace-nowrap">
                    GitSmart
                  </h1>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                    AI Course Automation
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Lock/Unlock Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            onClick={toggleLock}
            className="mt-4 ml-2 w-fit justify-start flex items-center space-x-2 px-2 mx-1 py-2 rounded-lg bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-neutral-500/80  dark:hover:bg-neutral-400/90 transition-all duration-200 group shadow-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="Toggle Sidebar"
          >
            {isLocked ? (
              <>
                <IoIosArrowBack
                // color={isExpanded ? "#ffffff" : "#6b7280"}
                  size={16}
                  className="text-neutral-600 dark:text-neutral-400  dark:group-hover:text-neutral-200 transition-colors group-hover:text-white"
                />
              </>
            ) : (
              <>
                <PanelLeftOpen 
                className="group-hover:text-white"
                  // alt="Expand"
                  width={20}
                  height={20}
                />
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Menu Items */}
        <div className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              {item.expandable ? (
                <motion.div
                  onClick={() => setIsCoursesExpanded(!isCoursesExpanded)}
                  className="group flex items-center px-4 py-3 rounded-xl hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 cursor-pointer transition-all duration-300 relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl`}
                  />

                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-r ${item.gradient} flex items-center justify-center shadow-medium flex-shrink-0`}
                  >
                    <item.icon size={18} className="text-white" />
                  </div>

                  <AnimatePresence mode="wait">
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="ml-4 flex-1 flex items-center justify-between overflow-hidden"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {item.label}
                        </span>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              getCourses();
                            }}
                            animate={{ rotate: loading ? 720 : 0 }}
                            transition={{ duration: 1 }}
                            className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                          ></motion.button>
                          <motion.div
                            animate={{ rotate: isCoursesExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <IoIosArrowForward
                              size={16}
                              className="text-neutral-600 dark:text-neutral-400"
                            />
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <Link href={item.href}>
                  <motion.div
                    className="group flex items-center px-4 py-3 rounded-xl hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 cursor-pointer transition-all duration-300 relative overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl`}
                    />

                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-r ${item.gradient} flex items-center justify-center shadow-medium flex-shrink-0`}
                    >
                      <item.icon size={18} className="text-white" />
                    </div>
                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="ml-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              )}

              {/* Courses Dropdown */}
              <AnimatePresence>
                {item.expandable && isCoursesExpanded && isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="ml-6 mt-2 overflow-hidden"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2 px-4 py-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <RefreshCw size={16} className="text-primary-500" />
                        </motion.div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Loading courses...
                        </p>
                      </div>
                    ) : error ? (
                      <div className="px-4 py-2">
                        <p className="text-sm text-red-500">{error}</p>
                      </div>
                    ) : courses.length === 0 ? (
                      <div className="px-4 py-2">
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center space-x-2">
                          <Sparkles size={16} />
                          <span>No courses available</span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {courses.map((course, idx) => (
                          <motion.div
                            key={course.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: idx * 0.05, duration: 0.2 }}
                          >
                            <Link
                              href={
                                username
                                  ? `/${username}/c/${course.id}`
                                  : `/courses/${course.id}`
                              }
                            >
                              <div className="group flex items-center justify-between px-4 py-2 text-sm bg-neutral-100/30 dark:bg-neutral-800/30 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-all duration-300 cursor-pointer">
                                <span className="text-gray-900 dark:text-gray-100 font-medium truncate">
                                  {course.title}
                                </span>
                                <motion.span
                                  className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${
                                    course.status === "in progress"
                                      ? "bg-yellow-500/20 text-yellow-600"
                                      : course.status == "not started"
                                      ? "bg-red-500/20 text-red-500"
                                      : "bg-green-500/20 text-green-600"
                                  }`}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  {course.status ?? "Unknown"}
                                </motion.span>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.nav>
  );
};

export default Sidenav;
