/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unused-vars */

"use client"

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Save, CheckCircle, AlertCircle } from "lucide-react";
import { UpdateUserDetails } from "../actions/user";

const ProfileForm = ({ user }: { user: any }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    lastName: user.lastName,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const res = await UpdateUserDetails(user.id, formData);

      if (res) {
        setMessage("Profile updated successfully!");
        setMessageType("success");
      } else {
        setMessage("Something went wrong. Please try again.");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Something went wrong. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full  mx-auto"
    >
      <div className="card-glass p-8 border border-primary-500 ring-4">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-glow mb-4"
          >
            <User className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100 mb-2">
            <span className="bg-gradient-to-r from-primary-500 to-secondary-500 text-transparent bg-clip-text">
                Profile Settings
            </span>
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Update your personal information and preferences
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <div className="flex gap-2 w-full">
          {/* First Name */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full"
          >
            <label className="label">
              <span className="flex items-center space-x-2">
                <User size={16} className="text-primary-500" />
                <span className="text-primary-500">First Name</span>
              </span>
            </label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your first name"
              required
            />
          </motion.div>

          {/* Last Name */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="w-full"
          >
            <label className="label">
              <span className="flex items-center space-x-2">
                <User size={16} className="text-primary-500" />
                <span className="text-primary-500">Last Name</span>
              </span>
            </label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your last name"
              required
            />
          </motion.div>
          </div>

          <div className="flex gap-2 w-full">
          {/* Email (Read-only) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="w-full"
          >
            <label className="label">
              <span className="flex items-center space-x-2">
                <Mail size={16} className="text-neutral-600 dark:text-neutral-400" />
                <span className="text-primary-500">Email Address</span>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">(Non-Editable)</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={user.email}
                disabled
                className="input-field bg-neutral-100/50 dark:bg-neutral-800/50 text-black-600 dark:text-black-400 cursor-not-allowed"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Lock size={16} className="text-black-600 dark:text-black-400" />
              </div>
            </div>
          </motion.div>

          {/* Username (Read-only) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="w-full"
          >
            <label className="label">
              <span className="flex items-center space-x-2">
                <User size={16} className="text-neutral-600 dark:text-neutral-400" />
                <span className="text-primary-500">Username</span>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">(Non-Editable)</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={user.userName}
                disabled
                className="input-field bg-neutral-100/50 dark:bg-neutral-800/50 text-black-600 dark:text-black-400 cursor-not-allowed"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Lock size={16} className="text-black-600 dark:text-black-400" />
              </div>
            </div>
          </motion.div>
        </div>
          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="pt-4"
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                loading 
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-not-allowed" 
                  : "btn-primary shadow-glow"
              }`}
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full"
                  />
                  <span className="text-primary-500">Updating...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Update Profile</span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-xl flex items-center space-x-3 ${
                  messageType === "success" 
                    ? "bg-accent-500/10 border border-accent-500/20" 
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                {messageType === "success" ? (
                  <CheckCircle size={20} className="text-accent-500" />
                ) : (
                  <AlertCircle size={20} className="text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  messageType === "success" ? "text-accent-500" : "text-red-500"
                }`}>
                  {message}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
        >
          <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
            Your profile information is secure and encrypted. Only you can modify your personal details.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProfileForm;