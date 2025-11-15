"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { GetUserByUserId } from "../actions/user";
import OnboardingModal from "./OnboardingModal";

/**
 * Checks if user needs onboarding and shows modal
 * Shows onboarding if: onboardingCompleted === false AND (no API keys OR no group memberships)
 * Only checks once per session to prevent repeated popups
 */
export default function OnboardingChecker() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [checking, setChecking] = useState(true);
  const hasCheckedRef = useRef(false); // Track if we've already checked in this session

  useEffect(() => {
    const checkOnboarding = async () => {
      // Only check once per page load (prevent duplicate checks during navigation)
      if (hasCheckedRef.current) {
        setChecking(false);
        return;
      }

      if (!isLoaded || !user) {
        setChecking(false);
        return;
      }

      // Skip onboarding check on sign-in page
      if (pathname?.includes("/sign-in")) {
        setChecking(false);
        return;
      }

      try {
        const dbUser = await GetUserByUserId(user.id);

        if (!dbUser) {
          setChecking(false);
          hasCheckedRef.current = true;
          return;
        }

        setUserName(dbUser.userName || "");

        // PRIMARY CHECK: If onboarding is already completed in DB, never show modal
        if (dbUser.onboardingCompleted === true) {
          setChecking(false);
          hasCheckedRef.current = true;
          return;
        }

        // SECONDARY CHECK: Only show if details are actually missing
        const hasNoApiKeys = !dbUser.geminiApiKey || !dbUser.groqApiKey;
        // Check for sectors (category groups) - user should join at least one sector
        // Global group is auto-joined, so we don't check for groups
        const hasNoSectors = await checkSectorMemberships(dbUser.id);
        
        const needsOnboarding = hasNoApiKeys || hasNoSectors;

        if (needsOnboarding) {
          setShowModal(true);
        } else {
          // User has everything but flag is false - mark as complete automatically
          await fetch("/api/user/onboarding-complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: dbUser.id }),
          }).catch(() => {
            // Non-blocking
          });
        }

        hasCheckedRef.current = true;
      } catch (error) {
        console.error("Error checking onboarding:", error);
        hasCheckedRef.current = true;
      } finally {
        setChecking(false);
      }
    };

    // Only check when user first loads, not on every pathname change
    if (isLoaded && user) {
      checkOnboarding();
    }
  }, [isLoaded, user]); // Removed pathname dependency to prevent re-checking on navigation

  // Helper to check if user has sector memberships (category groups)
  const checkSectorMemberships = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/groups/my`);
      if (response.ok) {
        const data = await response.json();
        const groups = data.data || [];
        // Filter for category groups (sectors) only
        const sectors = groups.filter((g: any) => g.type === "CATEGORY");
        return sectors.length === 0;
      }
      return false; // If can't fetch, assume they have sectors (don't force onboarding)
    } catch {
      return false; // If error, don't force onboarding
    }
  };

  // Handle modal close
  const handleClose = () => {
    setShowModal(false);
    hasCheckedRef.current = true; // Mark as checked so it won't show again in this session
  };

  if (checking || !showModal || !userName) {
    return null;
  }

  return (
    <OnboardingModal
      isOpen={showModal}
      userName={userName}
      onClose={handleClose}
    />
  );
}

