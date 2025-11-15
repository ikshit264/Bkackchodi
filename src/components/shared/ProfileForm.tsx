/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unused-vars */

"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Save, CheckCircle, AlertCircle, Eye, EyeOff, Key, GraduationCap, Building2, Image as ImageIcon, Upload, X, MapPin, Globe } from "lucide-react";
import { UpdateUserApiDetails } from "../actions/user";

const ProfileForm = ({ user }: { user: any }) => {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    lastName: user?.lastName || "",
    geminiApiKey: user?.geminiApiKey || "",
    groqApiKey: user?.groqApiKey || "",
    collegeName: user?.collegeName || "",
    graduationYear: user?.graduationYear?.toString() || "",
    avatar: user?.avatar || "",
    country: user?.country || "",
    city: user?.city || "",
    region: user?.region || "",
    timezone: user?.timezone || "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user?.name || "",
        lastName: user?.lastName || "",
        geminiApiKey: user?.geminiApiKey || "",
        groqApiKey: user?.groqApiKey || "",
        collegeName: user?.collegeName || "",
        graduationYear: user?.graduationYear?.toString() || "",
        avatar: user?.avatar || "",
        country: user?.country || "",
        city: user?.city || "",
        region: user?.region || "",
        timezone: user?.timezone || "",
      });
    }
  }, [user]);

  // Load API keys from localStorage or database on mount
  useEffect(() => {
    const loadApiKeys = async () => {
      // Check localStorage first
      const localGemini = localStorage.getItem("gemini_api_key");
      const localGroq = localStorage.getItem("groq_api_key");

      if (localGemini || localGroq) {
        setFormData((prev) => ({
          ...prev,
          geminiApiKey: localGemini || prev.geminiApiKey,
          groqApiKey: localGroq || prev.groqApiKey,
        }));
      }

      // If no localStorage, fetch from database
      if (!localGemini || !localGroq) {
        try {
          const response = await fetch("/api/user/api-keys");
          if (response.ok) {
            const data = await response.json();
            setFormData((prev) => ({
              ...prev,
              geminiApiKey: data.geminiApiKey || prev.geminiApiKey || "",
              groqApiKey: data.groqApiKey || prev.groqApiKey || "",
            }));
            // Store in localStorage if found
            if (data.geminiApiKey) {
              localStorage.setItem("gemini_api_key", data.geminiApiKey);
            }
            if (data.groqApiKey) {
              localStorage.setItem("groq_api_key", data.groqApiKey);
            }
          }
        } catch (error) {
          console.error("Error loading API keys:", error);
        }
      }
    };

    loadApiKeys();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        setMessage("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.");
        setMessageType("error");
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setMessage("File size too large. Maximum size is 5MB.");
        setMessageType("error");
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;

    setUploadingImage(true);
    setMessage("");
    setMessageType("");

    try {
      console.log("[Frontend] Starting image upload...");
      
      // Create FormData with file
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);

      // Step 1: Upload to Cloudinary and save to database
      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Frontend] Upload failed:", data.error);
        setMessage(data.error || "Failed to upload image");
        setMessageType("error");
        return;
      }

      console.log("[Frontend] Image uploaded successfully, Cloudinary URL:", data.imageUrl);

      // Step 2: Update form data with the Cloudinary URL from database
      setFormData({ ...formData, avatar: data.imageUrl });
      setMessage("Image uploaded successfully and saved to database!");
      setMessageType("success");
      setSelectedFile(null);
      setImagePreview(null);
      
      // Reset file input
      const fileInput = document.getElementById("avatar-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("[Frontend] Upload error:", error);
      setMessage("Failed to upload image. Please try again.");
      setMessageType("error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    const fileInput = document.getElementById("avatar-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      console.log("[Frontend] Starting profile update...");
      
      // Update basic profile info via API
      const profileResponse = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name || null,
          lastName: formData.lastName || null,
          collegeName: formData.collegeName || null,
          graduationYear: formData.graduationYear || null,
          avatar: formData.avatar || null,
          country: formData.country || null,
          city: formData.city || null,
          region: formData.region || null,
          timezone: formData.timezone || null,
        }),
      });

      const profileData = await profileResponse.json();

      if (!profileResponse.ok) {
        console.error("[Frontend] Profile update failed:", profileData.error);
        setMessage(profileData.error || "Failed to update profile");
        setMessageType("error");
        return;
      }

      console.log("[Frontend] Profile updated successfully:", profileData);

      // Update API keys (still using server action)
      const clerkId = user.clerkId || user.id;
      const gemini_api_key = formData.geminiApiKey ? formData.geminiApiKey.trim() : '';
      const groq_api_key = formData.groqApiKey ? formData.groqApiKey.trim() : '';
      
      try {
        await UpdateUserApiDetails(clerkId, {
          gemini_api_key,
          groq_api_key
        });
      } catch (apiKeyError) {
        console.error("[Frontend] API key update failed:", apiKeyError);
        // Don't fail the whole update if API keys fail
      }

      setMessage("Profile updated successfully!");
      setMessageType("success");
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
            className="w-16 h-16 bg-gradient-to-r  rounded-2xl flex items-center justify-center aspect-square shadow-glow mb-4"
          >
            {
              imagePreview || formData.avatar ? (
                <img
                  src={imagePreview || formData.avatar}
                  alt="Profile preview"
                  className="w-20 h-16 rounded-full object-cover border-2 aspect-square border-primary-500/20"
                />
              ) : (
                <User className="w-8 h-8 text-white" />
              )
            }
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

        {/* API Keys Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Key size={20} className="text-primary-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI API Keys
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowApiKeys(!showApiKeys)}
              className="text-sm text-primary-500 hover:text-primary-600 transition-colors"
            >
              {showApiKeys ? "Hide" : "Show"} API Keys
            </button>
          </div>

          {showApiKeys && (
            <div className="space-y-4">
              {/* Gemini API Key */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="label">
                  <span className="flex items-center space-x-2">
                    <Key size={16} className="text-primary-500" />
                    <span className="text-primary-500">Gemini API Key</span>
                  </span>
                </label>
                <div className="relative">
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type={showGeminiKey ? "text" : "password"}
                    name="geminiApiKey"
                    value={formData.geminiApiKey}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="Enter your Gemini API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 dark:text-neutral-400 hover:text-primary-500"
                  >
                    {showGeminiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Used for Gemini AI services
                </p>
              </motion.div>

              {/* Groq API Key */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="label">
                  <span className="flex items-center space-x-2">
                    <Key size={16} className="text-primary-500" />
                    <span className="text-primary-500">Groq API Key</span>
                  </span>
                </label>
                <div className="relative">
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type={showGroqKey ? "text" : "password"}
                    name="groqApiKey"
                    value={formData.groqApiKey}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="Enter your Groq API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 dark:text-neutral-400 hover:text-primary-500"
                  >
                    {showGroqKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Used for Groq AI services
                </p>
              </motion.div>
            </div>
          )}
        </motion.div>

        {/* Other Details Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.66 }}
          className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-2 mb-4">
            <User size={20} className="text-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Other Details
            </h3>
            <span className="text-xs text-neutral-500">(Optional)</span>
          </div>

          <div className="space-y-4">
            {/* College Name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="label">
                <span className="flex items-center space-x-2">
                  <Building2 size={16} className="text-primary-500" />
                  <span className="text-primary-500">College Name</span>
                </span>
              </label>
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="text"
                name="collegeName"
                value={formData.collegeName}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your college/university name"
              />
            </motion.div>

            {/* Graduation Year */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="label">
                <span className="flex items-center space-x-2">
                  <GraduationCap size={16} className="text-primary-500" />
                  <span className="text-primary-500">Graduation Year</span>
                </span>
              </label>
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="number"
                name="graduationYear"
                value={formData.graduationYear}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 2025"
                min="1900"
                max="2100"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Enter your expected or actual graduation year
              </p>
            </motion.div>

            {/* Location Fields */}
            <div className="flex gap-2 w-full">
              {/* Country */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <label className="label">
                  <span className="flex items-center space-x-2">
                    <Globe size={16} className="text-primary-500" />
                    <span className="text-primary-500">Country</span>
                  </span>
                </label>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., United States"
                />
              </motion.div>

              {/* City */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <label className="label">
                  <span className="flex items-center space-x-2">
                    <MapPin size={16} className="text-primary-500" />
                    <span className="text-primary-500">City</span>
                  </span>
                </label>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., New York"
                />
              </motion.div>
            </div>

            <div className="flex gap-2 w-full">
              {/* Region */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <label className="label">
                  <span className="flex items-center space-x-2">
                    <Globe size={16} className="text-primary-500" />
                    <span className="text-primary-500">Region</span>
                  </span>
                </label>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="text"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., North America"
                />
              </motion.div>

              {/* Timezone */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <label className="label">
                  <span className="flex items-center space-x-2">
                    <Globe size={16} className="text-primary-500" />
                    <span className="text-primary-500">Timezone</span>
                  </span>
                </label>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="text"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., America/New_York"
                />
              </motion.div>
            </div>

            {/* Avatar Upload */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="label">
                <span className="flex items-center space-x-2">
                  <ImageIcon size={16} className="text-primary-500" />
                  <span className="text-primary-500">Profile Picture</span>
                </span>
              </label>
              
              {/* File Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="avatar-upload"
                    className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-primary-500/50 rounded-lg cursor-pointer hover:border-primary-500 transition-colors bg-primary-500/5 hover:bg-primary-500/10"
                  >
                    <Upload size={18} className="text-primary-500 mr-2" />
                    <span className="text-sm text-primary-500 font-medium">
                      {selectedFile ? "Change File" : "Upload Image"}
                    </span>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleUploadImage}
                      disabled={uploadingImage}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                      {uploadingImage ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span>Upload</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleRemoveSelectedFile}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove selected file"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-3 p-3 bg-neutral-100/50 dark:bg-neutral-800/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}

                {/* Image Preview */}
                {(imagePreview || formData.avatar) && (
                  <div className="mt-3">
                    <p className="text-xs text-neutral-500 mb-2">Preview:</p>
                    <div className="relative inline-block">
                      <img
                        src={imagePreview || formData.avatar}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary-500/20"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2 bg-white dark:bg-gray-900 text-neutral-500">OR</span>
                  </div>
                </div>

                {/* URL Input */}
                <div>
                  <label className="label">
                    <span className="flex items-center space-x-2">
                      <ImageIcon size={16} className="text-primary-500" />
                      <span className="text-primary-500">Profile Picture URL</span>
                    </span>
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type="url"
                    name="avatar"
                    value={formData.avatar}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="https://example.com/your-image.jpg"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Enter a URL to your profile picture. If left empty, your GitHub avatar will be used.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

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