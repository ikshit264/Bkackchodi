import { motion } from "framer-motion";
import React from "react";
import ExpandingAccordion from "../shared/ExpandingAccordian";
import { Batch } from "../shared/schema/Batch";

type ProjectsProps = {
  Batch: Batch;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
};

const ProjectList: React.FC<ProjectsProps> = ({
  Batch,
  activeTab,
  setActiveTab,
}) => {
    // console.log(Batch);
  return (
    <div className="relative">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: activeTab ? "0%" : "100%" }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="fixed bottom-0 left-0 w-full h-full glass shadow-lg px-40 py-20 z-[100] bg-white dark:bg-neutral-900"
      >
        <button
          className="absolute top-4 right-4 text-xl text-black dark:text-white hover:text-red-500 dark:hover:text-red-400 transition-colors"
          onClick={() => setActiveTab(null)}
        >
          ✖
        </button>
        <div className="flex gap-4 justify-around flex-wrap items-center">
          {Batch && <ExpandingAccordion items={Batch.projects}/> }
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectList;
