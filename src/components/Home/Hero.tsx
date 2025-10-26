"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { FaRobot, FaCode, FaRocket } from "react-icons/fa";
import { Sparkles, Zap, Brain } from "lucide-react";

// FlippingText component for the word changing animation
const FlippingText = ({
  text,
  className,
}: {
  text: string;
  className: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: 90 }}
      animate={{ opacity: 1, rotateX: 0 }}
      transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
      className={className}
    >
      {text}
    </motion.div>
  );
};

const GitSmartHero = () => {
  const containerRef = useRef(null);
  const { scrollY } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Parallax effect values
  const line1X = useTransform(scrollY, [0, 300], [0, -50]);
  const line2X = useTransform(scrollY, [0, 300], [0, 50]);
  const heroY = useTransform(scrollY, [0, 300], [0, -100]);

  return (
    <motion.section
      ref={containerRef}
      className="relative w-full min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 overflow-hidden"
      initial="hidden"
      animate="visible"
      style={{ y: heroY }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.2 }}
          transition={{ duration: 2, delay: 0.8 }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-accent-500/20 to-purple-500/20 rounded-full blur-3xl"
        />
        
        {/* Floating Icons */}
        <motion.div
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-20 text-primary-500/30"
        >
          <FaCode size={32} />
        </motion.div>
        <motion.div
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-32 right-32 text-secondary-500/30"
        >
          <Brain size={28} />
        </motion.div>
        <motion.div
          animate={{ y: [-5, 15, -5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-32 left-32 text-accent-500/30"
        >
          <Zap size={24} />
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-6xl mx-auto">
        {/* Logo and Brand */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col items-center mb-12"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.4, type: "spring", stiffness: 200 }}
            className="relative mb-6"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 via-secondary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-glow animate-glow">
              <FaRobot className="w-10 h-10 text-white" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-2 border-2 border-primary-500/30 rounded-2xl"
            />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-4"
          >
            <span className="text-gradient">GitSmart</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl"
          >
            AI-Powered Course Roadmap Automation Platform
          </motion.p>
        </motion.div>

        {/* Main Headline */}
        <div className="w-full font-display font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight mb-12">
          <motion.div
            className="flex flex-col items-center space-y-4"
            style={{ x: line1X }}
          >
            <motion.div
              initial={{ opacity: 0, y: 100, skew: "-30deg" }}
              animate={{ opacity: 1, y: 0, skew: "0deg" }}
              transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
              className="flex items-center space-x-4"
            >
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="text-gradient-purple"
              >
                Smart
              </motion.span>
              <motion.div
                initial={{ opacity: 0, scale: 3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-glow"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="text-gradient"
              >
                Learning
              </motion.span>
            </motion.div>
          </motion.div>

          <motion.div
            className="flex items-center justify-center space-x-4"
            style={{ x: line2X }}
          >
            <motion.span
              initial={{ opacity: 0, y: 50, skew: "-30deg" }}
              animate={{ opacity: 1, y: 0, skew: "0deg" }}
              transition={{ duration: 0.8, delay: 1.4, ease: "easeOut" }}
              whileHover={{ scale: 1.05 }}
              className="text-gradient-green"
            >
              Seamless
            </motion.span>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 1.6, ease: "easeOut" }}
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.8 }}
              className="w-16 h-16 bg-gradient-to-br from-accent-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-glow"
            >
              <FaRocket className="w-8 h-8 text-white" />
            </motion.div>
            <FlippingText
              text="Automation"
              className="text-gradient-purple"
            />
          </motion.div>
        </div>

        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.8 }}
          className="mb-12"
        >
          <p className="text-xl sm:text-2xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed">
            Master Git. Automate Workflows. Code Smarter.
            <br />
            <span className="text-gradient">Transform your development journey with AI-powered learning paths.</span>
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 2 }}
          className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary text-lg px-8 py-4 rounded-2xl shadow-glow"
          >
            <span className="flex items-center space-x-2">
              <Sparkles size={20} />
              <span>Start Learning</span>
            </span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="btn-ghost text-lg px-8 py-4 rounded-2xl"
          >
            <span className="flex items-center space-x-2">
              <Brain size={20} />
              <span>Explore Features</span>
            </span>
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 2.2 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          {[
            { number: "10K+", label: "Students" },
            { number: "500+", label: "Courses" },
            { number: "95%", label: "Success Rate" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 2.4 + index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-gradient mb-2">{stat.number}</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};

export default GitSmartHero;
