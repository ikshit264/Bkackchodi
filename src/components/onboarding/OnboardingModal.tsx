"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Key,
  Users,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { GetUserByUserId, UpdateUserDetails, UpdateUserApiDetails } from "../actions/user";
import { getAllGroups, joinGroup } from "../actions/group";
import type { Group } from "../../types/groups";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  userName: string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  userName,
}) => {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();
  const [step, setStep] = useState<"info" | "groups" | "joining" | "complete">("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    geminiApiKey: "",
    groqApiKey: "",
  });

  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [joiningProgress, setJoiningProgress] = useState({ current: 0, total: 0 });
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  // Load user data
  useEffect(() => {
    if (isLoaded && clerkUser && isOpen) {
      const loadUserData = async () => {
        try {
          const dbUser = await GetUserByUserId(clerkUser.id);
          setDbUserId(dbUser.id);
          setFormData({
            name: dbUser.name || clerkUser.firstName || "",
            lastName: dbUser.lastName || clerkUser.lastName || "",
            geminiApiKey: dbUser.geminiApiKey || "",
            groqApiKey: dbUser.groqApiKey || "",
          });
        } catch (err) {
          console.error("Error loading user:", err);
        }
      };
      loadUserData();
    }
  }, [isLoaded, clerkUser, isOpen]);

  // Load available category groups
  useEffect(() => {
    if (isOpen && step === "groups") {
      const loadGroups = async () => {
        try {
          const response = await fetch("/api/groups?type=CATEGORY&isPrivate=false&includeCounts=true");
          if (response.ok) {
            const data = await response.json();
            setAvailableGroups(data.data || []);
          } else {
            setError("Failed to load groups");
          }
        } catch (err) {
          console.error("Error loading groups:", err);
          setError("Failed to load groups");
        }
      };
      loadGroups();
    }
  }, [isOpen, step]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!clerkUser) throw new Error("User not authenticated");

      // Update user details
      await UpdateUserDetails(clerkUser.id, {
        name: formData.name,
        lastName: formData.lastName,
      });

      // Update API keys if provided
      if (formData.geminiApiKey || formData.groqApiKey) {
        await UpdateUserApiDetails(clerkUser.id, {
          gemini_api_key: formData.geminiApiKey.trim(),
          groq_api_key: formData.groqApiKey.trim(),
        });
      }

      setStep("groups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save information");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupsSubmit = async () => {
    // Groups are optional - user can skip
    if (selectedGroups.length === 0) {
      // Skip directly to complete
      if (dbUserId) {
        await fetch("/api/user/onboarding-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: dbUserId }),
        }).catch(() => {});
      }
      setStep("complete");
      return;
    }

    setStep("joining");
    setJoiningProgress({ current: 0, total: selectedGroups.length });
    setError(null);

    try {
      // Join all selected groups sequentially with progress
      for (let i = 0; i < selectedGroups.length; i++) {
        const groupId = selectedGroups[i];
        try {
          await joinGroup(groupId);
          setJoiningProgress({ current: i + 1, total: selectedGroups.length });
        } catch (err) {
          console.error(`Failed to join group ${groupId}:`, err);
          // Continue with other groups even if one fails
        }
      }

      // Mark onboarding as complete
      if (dbUserId) {
        await fetch("/api/user/onboarding-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: dbUserId }),
        }).catch(() => {
          // Non-blocking - can be set manually if needed
        });
      }

      setStep("complete");
      
      // Close modal and redirect after short delay
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
        // Use window.location for immediate redirect to prevent modal from staying
        window.location.href = `/${userName}/c`;
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join groups");
      setStep("groups");
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Close modal when step is complete and redirect happens
  useEffect(() => {
    if (step === "complete" && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="onboarding-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border-4 border-slate-800 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Welcome! Let's Get Started
            </h2>
            {step !== "joining" && step !== "complete" && onClose && (
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: User Info */}
            {step === "info" && (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleInfoSubmit}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    API Keys (Optional but Recommended)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Gemini API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showGeminiKey ? "text" : "password"}
                          value={formData.geminiApiKey}
                          onChange={(e) =>
                            setFormData({ ...formData, geminiApiKey: e.target.value })
                          }
                          className="w-full px-4 py-2 pr-10 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter your Gemini API key"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                        >
                          {showGeminiKey ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Groq API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showGroqKey ? "text" : "password"}
                          value={formData.groqApiKey}
                          onChange={(e) =>
                            setFormData({ ...formData, groqApiKey: e.target.value })
                          }
                          className="w-full px-4 py-2 pr-10 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter your Groq API key"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGroqKey(!showGroqKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                        >
                          {showGroqKey ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Continue"}
                </button>
              </motion.form>
            )}

            {/* Step 2: Group Selection */}
            {step === "groups" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Join Category Groups (Optional)
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    Select category groups to compete in your field. You can skip this and join later. You're already in the Global group!
                  </p>

                  {availableGroups.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Loading groups...</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availableGroups.map((group) => (
                        <label
                          key={group.id}
                          className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedGroups.includes(group.id)
                              ? "border-primary-500 bg-primary-500/10"
                              : "border-neutral-300 dark:border-neutral-600 hover:border-primary-500/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroups.includes(group.id)}
                            onChange={() => toggleGroup(group.id)}
                            className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {group.icon && <span className="text-xl">{group.icon}</span>}
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {group.name}
                              </div>
                            </div>
                            {group.description && (
                              <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                {group.description}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setStep("info")}
                    className="flex-1 py-3 px-6 border border-neutral-300 dark:border-neutral-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGroupsSubmit}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing..." : selectedGroups.length > 0 ? "Join Groups" : "Skip & Continue"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Joining Groups */}
            {step === "joining" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-6 py-8"
              >
                <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary-500" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Joining Groups...
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {joiningProgress.current} of {joiningProgress.total} groups joined
                  </p>
                  <div className="mt-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${
                          (joiningProgress.current / joiningProgress.total) * 100
                        }%`,
                      }}
                      className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {step === "complete" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-6 py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto bg-accent-500/20 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-12 h-12 text-accent-500" />
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Welcome Aboard!
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Redirecting to your dashboard...
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;

