"use client"
import { motion } from "framer-motion";
import GitSmartHero from "../components/Home/Hero";
import FeaturesSection from "../components/Home/Features";
import MentorsSlider from "../components/Home/MentorsSlide";

export default function Home() {
  return (
    <motion.div 
      className="overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <GitSmartHero/>
      <FeaturesSection/>
      <MentorsSlider/>
    </motion.div>
  );
}