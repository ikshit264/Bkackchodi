/**
 * Group actions - Client-side API calls
 */
import type { Group, UserGroupWithScore, ApiResponse } from "../../../types/groups";

export async function getAllGroups(): Promise<Group[]> {
  const response = await fetch("/api/groups?includeMemberCount=true", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json();
    throw new Error(error.error || "Failed to fetch groups");
  }

  const data: ApiResponse<Group[]> = await response.json();
  return data.data || [];
}

export async function getUserGroups(userId: string): Promise<UserGroupWithScore[]> {
  const response = await fetch(`/api/groups/user/${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json();
    throw new Error(error.error || "Failed to fetch user groups");
  }

  const data: ApiResponse<UserGroupWithScore[]> = await response.json();
  return data.data || [];
}

export async function joinGroup(groupId: string): Promise<{ success: boolean }> {
  const response = await fetch("/api/groups/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ groupId }),
  });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json();
    throw new Error(error.error || "Failed to join group");
  }

  const data: ApiResponse<{ success: boolean }> = await response.json();
  return data.data || { success: false };
}

export async function leaveGroup(groupId: string): Promise<{ success: boolean }> {
  const response = await fetch("/api/groups/leave", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ groupId }),
  });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json();
    throw new Error(error.error || "Failed to leave group");
  }

  const data: ApiResponse<{ success: boolean }> = await response.json();
  return data.data || { success: false };
}

export async function createGroup(
  name: string,
  description?: string
): Promise<Group> {
  const response = await fetch("/api/groups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description }),
  });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json();
    throw new Error(error.error || "Failed to create group");
  }

  const data: ApiResponse<Group> = await response.json();
  return data.data!;
}

