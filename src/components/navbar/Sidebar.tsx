/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHome, FaRobot } from "react-icons/fa";
import { IoIosArrowBack } from "react-icons/io";
import { AiOutlinePlusCircle, AiOutlineProfile } from "react-icons/ai";
import { PanelLeftOpen, Trophy } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { GetUserByUserId } from "../actions/user";
import { useRouter } from "next/navigation";
import { Shield, Building2 } from "lucide-react";

const Sidenav = () => {
  const { user, isLoaded } = useUser();
  const [username, setUsername] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const fetchUsername = async () => {
      try {
        const fetched = await GetUserByUserId(user.id);

        // Add null check here
        if (!fetched) {
          console.warn("User not found in database");
          router.push("/");
          setUsername(null);
          return;
        }

        const name = fetched.userName;
        setUsername(name ?? null);

        // Check if admin
        try {
          const adminRes = await fetch("/api/admin/check");
          const adminData = await adminRes.json();
          setIsAdminUser(adminData.isAdmin || false);
        } catch {
          setIsAdminUser(false);
        }
      } catch (err) {
        console.error("Error fetching username:", (err as Error).message);
        setUsername(null);
      }
    };

    fetchUsername();
  }, [user, isLoaded]);


  // Fetch unread notification count
  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications?status=unread&limit=1', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.total || 0);
        }
      } catch (err) {
        console.error("Error fetching unread notifications count:", err);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    // Refresh when window regains focus
    const handleFocus = () => {
      fetchUnreadCount();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isLoaded, user]);

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
  
  const menuItems = [
    {
      icon: AiOutlineProfile,
      label: "Courses",
      gradient: "from-accent-500 to-accent-600",
      href: username ? `/${username}/c` : "/profile",
    },
    {
      icon: Trophy,
      label: "Challenges",
      href: "/challenges",
      gradient: "from-yellow-500 to-orange-600",
    },
    {
      icon: AiOutlineProfile,
      label: "Groups",
      href: "/groups",
      gradient: "from-secondary-500 to-secondary-600",
    },
    {
      icon: AiOutlineProfile,
      label: "Notifications",
      href: "/notifications",
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
    ...(isAdminUser
      ? [
          {
            icon: Shield,
            label: "Admin",
            href: "/admin",
            gradient: "from-purple-500 to-pink-600",
          },
        ]
      : []),
  ];


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
                <Link href={item.href}>
                  <motion.div
                    className="group flex items-center px-4 py-3 rounded-xl hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 cursor-pointer transition-all duration-300 relative overflow-visible"
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
                          className="ml-4 flex items-center gap-2 flex-1 overflow-hidden"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {item.label}
                          </span>
                          {item.label === "Notifications" && unreadCount > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center"
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </motion.span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Show badge even when sidebar is collapsed */}
                    {!isExpanded && item.label === "Notifications" && unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </motion.div>
                </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.nav>
  );
};

export default Sidenav;
