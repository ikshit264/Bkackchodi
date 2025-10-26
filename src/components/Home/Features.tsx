"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  FaRocket, 
  FaGraduationCap, 
  FaGlobe, 
  FaUserCog, 
  FaCode 
} from "react-icons/fa";
import { 
  Sparkles, 
  Zap, 
  Shield, 
  Target, 
  Brain,
  ArrowRight 
} from "lucide-react";

const features = [
  {
    icon: FaRocket,
    title: "No more boring tutorials",
    description: "Learn by building real projects that matter.",
    gradient: "from-primary-500 to-primary-600",
    delay: 0.1
  },
  {
    icon: FaGraduationCap,
    title: "Made for beginners",
    description: "Smooth, zero-overwhelm experience designed for success.",
    gradient: "from-secondary-500 to-secondary-600",
    delay: 0.2
  },
  {
    icon: FaGlobe,
    title: "Access anywhere",
    description: "Your roadmap follows you, anytime, anywhere.",
    gradient: "from-accent-500 to-accent-600",
    delay: 0.3
  },
  {
    icon: FaUserCog,
    title: "Personalized journey",
    description: "Every user gets a unique project experience.",
    gradient: "from-purple-500 to-purple-600",
    delay: 0.4
  },
  {
    icon: FaCode,
    title: "Learn Git & automation",
    description: "Master workflows and actually enjoy the process.",
    gradient: "from-pink-500 to-pink-600",
    delay: 0.5
  }
];

const FeaturesSection = () => {
  return (
    <section className="relative w-full py-20 sm:py-24 md:py-32 bg-gradient-to-b from-background to-neutral-100/20 dark:to-neutral-800/20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1.1, 1, 1.1],
            opacity: [0.2, 0.1, 0.2]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-accent-500/10 to-purple-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 px-4 py-2 rounded-full mb-6"
          >
            <Sparkles className="w-5 h-5 text-primary-500" />
            <span className="text-sm font-medium text-primary-500">Why GitSmart</span>
          </motion.div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6">
            Hits{" "}
            <span className="text-gradient">different</span>
          </h2>
          
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed">
            Experience the future of learning with AI-powered course automation 
            that adapts to your pace and style.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: feature.delay }}
              viewport={{ once: true }}
              className="group"
            >
              <motion.div
                whileHover={{ 
                  y: -8,
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
                className="relative h-full p-8 card-glass hover:shadow-glow transition-all duration-500"
              >
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />
                
                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center shadow-medium mb-6 group-hover:shadow-glow transition-all duration-300`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 group-hover:text-gradient transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  {/* Learn More Link */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="flex items-center text-primary-500 font-medium text-sm group-hover:text-primary-400 transition-colors"
                  >
                    <span>Learn more</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${feature.gradient}`} />
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-8 py-4 rounded-2xl shadow-glow cursor-pointer"
          >
            <Brain className="w-6 h-6" />
            <span className="text-lg font-semibold">Start Your AI Learning Journey</span>
            <ArrowRight className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;