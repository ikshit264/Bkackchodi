import React, {useEffect, useState} from "react";
import { motion } from "framer-motion";
import { BookOpen, Clock, CheckCircle, XCircle, AlertCircle, Trophy, Users } from "lucide-react";
import axios from "axios";

interface ChallengeInfo {
  name: string;
  status: string;
}

const CourseCard = ({ 
  title, 
  status, 
  Id, 
  groupName, 
  ownership,
  ownerUserName,
  challenge 
}: { 
  title: string; 
  status: string; 
  Id: string; 
  groupName?: string | null; 
  ownership?: 'OWNER' | 'READ_ONLY' | 'COPY' | 'SYNC_COPY';
  ownerUserName?: string;
  challenge?: ChallengeInfo | null;
}) => {

  const [InProgress, setInProgress] = useState(0);
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return {
          icon: CheckCircle,
          color: "text-accent-500",
          bgColor: "bg-accent-500/10",
          borderColor: "border-accent-500/20",
          gradient: "from-accent-500 to-accent-600"
        };
      case "not started":
        return {
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          gradient: "from-red-500 to-red-600"
        };
      case "in progress":
      default:
        return {
          icon: AlertCircle,
          color: "text-primary-500",
          bgColor: "bg-primary-500/10",
          borderColor: "border-primary-500/20",
          gradient: "from-primary-500 to-primary-600"
        };
    }
  };

  useEffect(() => {
    const runit = async () => {
      const res = await axios.post('/api/query/course/progress', { courseId: Id });
      console.log(res.data);
      setInProgress(res.data.percentages.inProgress);
    };
  
    runit();
  }, [Id])
  
  const statusConfig = getStatusConfig(status);

  // Get challenge status color
  const getChallengeStatusColor = (challengeStatus: string) => {
    switch (challengeStatus) {
      case "ACTIVE":
        return {
          bg: "bg-green-500/10",
          text: "text-green-600 dark:text-green-400",
          border: "border-green-500/20",
        };
      case "COMPLETED":
        return {
          bg: "bg-blue-500/10",
          text: "text-blue-600 dark:text-blue-400",
          border: "border-blue-500/20",
        };
      case "DRAFT":
        return {
          bg: "bg-gray-500/10",
          text: "text-gray-600 dark:text-gray-400",
          border: "border-gray-500/20",
        };
      case "CANCELLED":
        return {
          bg: "bg-red-500/10",
          text: "text-red-600 dark:text-red-400",
          border: "border-red-500/20",
        };
      default:
        return {
          bg: "bg-gray-500/10",
          text: "text-gray-600 dark:text-gray-400",
          border: "border-gray-500/20",
        };
    }
  };

  // Format access level for display
  // Note: SYNC_COPY is only for challenges, not shown in regular UI
  const getAccessLevelLabel = (access: string) => {
    switch (access) {
      case "READ_ONLY":
        return "READ ONLY";
      case "COPY":
        return "COPY";
      default:
        return access;
    }
  };

  const isShared = ownership && ownership !== 'OWNER';
  const challengeStatusColor = challenge ? getChallengeStatusColor(challenge.status) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -8,
        scale: 1.02,
        transition: { duration: 0.3 }
      }}
      viewport={{ once: true }}
      className="group relative w-full max-w-sm mx-auto"
    >
      <div className={`relative p-6 card-glass hover:shadow-glow transition-all duration-500 border ${statusConfig.borderColor}`}>
        {/* Background gradient on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${statusConfig.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />
        
        {/* Header */}
        <div className="relative z-10 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-12 h-12 rounded-xl bg-gradient-to-r ${statusConfig.gradient} flex items-center justify-center shadow-medium group-hover:shadow-glow transition-all duration-300 flex-shrink-0`}
              >
                <BookOpen className="w-6 h-6 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-gradient transition-all duration-300 line-clamp-2">
                  {title}
                </h3>
                <div className="flex items-center space-x-1 mt-1.5 flex-wrap gap-y-1">
                  <Clock className="w-4 h-4 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Self-paced</span>
                  {groupName && (
                    <>
                      <span className="text-sm text-neutral-500 dark:text-neutral-500 mx-1">•</span>
                      <span className="text-sm text-primary-500 dark:text-primary-400 font-medium">{groupName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Course Status Indicator */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color} flex-shrink-0 ml-2`}
            >
              <statusConfig.icon className="w-4 h-4" />
              <span className="text-xs font-medium capitalize">
                {status}
              </span>
            </motion.div>
          </div>

          {/* Course Metadata - Access Level, Challenge, Group, Owner */}
          <div className="space-y-2 mt-3">
            {/* Ownership Badge */}
            {ownership === 'OWNER' && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  🏠 My Course
                </span>
              </div>
            )}

            {/* Access Level Badge - Always show for shared courses */}
            {isShared && ownership !== 'SYNC_COPY' && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  {ownership === 'READ_ONLY' && '👁️ View Only'}
                  {ownership === 'COPY' && '📋 Cloned Copy'}
                </span>
                {ownerUserName && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                    • by {ownerUserName}
                  </span>
                )}
              </div>
            )}
            {/* Challenge courses (SYNC_COPY) - show challenge badge instead */}
            {ownership === 'SYNC_COPY' && challenge && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <Trophy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                  Challenge Course
                </span>
              </div>
            )}

            {/* Challenge Badge */}
            {challenge && challengeStatusColor && (
              <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md ${challengeStatusColor.bg} border ${challengeStatusColor.border}`}>
                <Trophy className={`w-3.5 h-3.5 ${challengeStatusColor.text}`} />
                <span className={`text-xs font-medium ${challengeStatusColor.text}`}>
                  Challenge: {challenge.name}
                </span>
                <span className={`text-xs font-semibold ${challengeStatusColor.text} capitalize ml-1`}>
                  ({challenge.status.toLowerCase()})
                </span>
              </div>
            )}

            {/* Group Badge */}
            {groupName && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  📁 {groupName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Progress</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {status === "completed" ? "100%" : InProgress + "%"}
            </span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ 
                width: status === "completed" ? "100%" : InProgress + "%"
              }}
              transition={{ duration: 1, delay: 0.2 }}
              viewport={{ once: true }}
              className={`h-2 rounded-full bg-gradient-to-r ${statusConfig.gradient} shadow-sm`}
            />
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
            status === "completed"
              ? "bg-accent-500/10 text-accent-500 hover:bg-accent-500/20 border border-accent-500/20"
              : status === "not started"
              ? "btn-primary"
              : "btn-secondary"
          }`}
        >
          {status === "completed" ? "Review Course" : status === "not started" ? "Start Learning" : "Continue Learning"}
        </motion.button>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${statusConfig.gradient}`} />
        </div>
        <div className="absolute bottom-4 left-4 opacity-5 group-hover:opacity-15 transition-opacity">
          <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${statusConfig.gradient}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default CourseCard;
