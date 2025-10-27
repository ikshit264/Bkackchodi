"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHome, FaRobot } from "react-icons/fa";
import { MdMessage} from "react-icons/md";
import { IoIosArrowForward } from "react-icons/io";
import { AiOutlinePlusCircle } from "react-icons/ai";
import { RefreshCw, Sparkles } from "lucide-react";
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
        // GetUserByUserId expected to return an object with userName
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
      icon: FaHome, 
      label: username ?? "Home", 
      href: username ? `/${username}/c` : "/",
      gradient: "from-primary-500 to-primary-600"
    },
    { 
      icon: MdMessage, 
      label: "c", 
      expandable: true,
      gradient: "from-secondary-500 to-secondary-600"
    },
    { 
      icon: AiOutlinePlusCircle, 
      label: "New Course", 
      href: username ? `/${username}/new_course` : "/new_course",
      gradient: "from-accent-500 to-accent-600"
    },
    // { 
    //   icon: MdAnalytics, 
    //   label: "profile", 
    //   href: username ? `/${username}/profile` : "/profile",
    //   gradient: "from-purple-500 to-purple-600"
    // },
    // { 
    //   icon: IoMdSettings, 
    //   label: "settings", 
    //   href: "/settings",
    //   gradient: "from-neutral-500 to-neutral-600"
    // },
  ];

  const getCourses = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get("/api/query/course");

      // Ensure JSON shape
      const payload =
        typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;

      const data: Course[] = Array.isArray(payload?.data)
        ? payload.data
        : [];

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
    // Initial load
    getCourses();
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const mouseX = event.clientX;
      if (mouseX < 100 && !isHovered) {
        setIsExpanded(true);
      } else if (mouseX > 200 && !isHovered) {
        setIsExpanded(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isHovered]);

  return (
    <motion.nav
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      onMouseEnter={() => {
        setIsHovered(true);
        setIsExpanded(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsExpanded(false);
      }}
      className={`fixed z-[999] left-0 top-0 h-full glass-dark transition-all duration-500 ease-in-out ${
        isExpanded ? "w-72" : "w-22"
      }`}
    >
      <div className="flex flex-col h-full py-6">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-6 mb-8"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-glow">
              <FaRobot className="w-6 h-6 text-white" />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-xl font-display font-bold text-gradient">
                    GitSmart
                  </h1>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">AI Course Automation</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Menu Items */}
        <div className="flex-1 px-4 space-y-2">
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
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl`} />
                  
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${item.gradient} flex items-center justify-center shadow-medium`}>
                    <item.icon size={18} className="text-white" />
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="ml-4 flex-1 flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.label}
                        </span>
                        <div className="flex items-center space-x-2">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              getCourses();
                            }}
                            animate={{ rotate: loading ? 720 : 0 }}
                            transition={{ duration: 1 }}
                            className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                          >
                            <RefreshCw size={16} className="text-neutral-600 dark:text-neutral-400" />
                          </motion.button>
                          <motion.div
                            animate={{ rotate: isCoursesExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <IoIosArrowForward size={16} className="text-neutral-600 dark:text-neutral-400" />
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
                    {/* Background gradient on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl`} />
                    
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${item.gradient} flex items-center justify-center shadow-medium`}>
                      <item.icon size={18} className="text-white" />
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.span
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="ml-4 text-sm font-medium text-gray-900 dark:text-gray-100"
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
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <RefreshCw size={16} className="text-primary-500" />
                        </motion.div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading courses...</p>
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
                            <Link href={username ? `/${username}/c/${course.id}` : `/courses/${course.id}`}>
                              <div className="group flex items-center justify-between px-4 py-2 text-sm bg-neutral-100/30 dark:bg-neutral-800/30 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-all duration-300 cursor-pointer">
                                <span className="text-gray-900 dark:text-gray-100 font-medium truncate">{course.title}</span>
                                <motion.span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    course.status === "Active"
                                      ? "bg-accent-500/20 text-accent-500"
                                      : "bg-red-500/20 text-red-500"
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

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-6 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Powered by AI • Built with ❤️
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.nav>
  );
};

export default Sidenav;