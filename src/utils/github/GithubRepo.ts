/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { GithubTokenExtract } from "./GithubBackchodi";

export async function createRepo(
  userId: string,
  projectId: string,
  RepoName: string,
  description: string
) {
  const ACCESS_TOKEN = await GithubTokenExtract(userId);

  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const baseUrl = `https://api.github.com/user/repos`;

  // Fetch all repos owned by the authenticated user
  async function fetchOwnedRepos(): Promise<string[]> {
    try {
      const res = await axios.get(`${baseUrl}?type=owner&per_page=100`, {
        headers,
      });
      return res.data.map((repo: any) => repo.name);
    } catch (err) {
      console.error("❌ Error fetching repos:", err);
      return [];
    }
  }

  function generateUniqueRepoName(
    baseName: string,
    existingRepos: string[]
  ): string {
    const normalizedBase = sanitizeRepoName(baseName);
    if (!existingRepos.includes(normalizedBase)) {
      return normalizedBase;
    }

    const escapedBase = normalizedBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escapedBase}-(\\d+)$`);
    const numberedRepos = existingRepos
      .filter((n) => pattern.test(n))
      .map((n) => {
        const m = n.match(pattern);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const nextNumber =
      numberedRepos.length > 0 ? Math.max(...numberedRepos) + 1 : 1;
    return `${normalizedBase}-${nextNumber}`;
  }

  try {
    // Step 1: Fetch all owned repos
    const existingRepos = await fetchOwnedRepos();

    // Step 2: Generate unique repo name if needed
    const uniqueRepoName = generateUniqueRepoName(RepoName, existingRepos);

    const response = await axios.post(
      "https://api.github.com/user/repos",
      {
        name: uniqueRepoName,
        description: description ?? "",
        private: true,
        is_template: false,
      },
      { headers }
    );

    return response.data.name;
  } catch (error: any) {
    console.error(
      "❌ Error creating repo:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Generate unique repo name if conflicts exist
function sanitizeRepoName(input: string): string {
  let name = input.toLowerCase();
  name = name.replace(/\s+/g, "-");

  name = name.replace(/[^a-z0-9\._-]/g, "-");

  name = name.replace(/-+/g, "-");

  name = name.replace(/^[-\.]+/, "").replace(/[-\.]+$/, "");

  if (!name) {
    name = "repo";
  }
  return name;
}

/**
 * Delete a GitHub repository
 * @param userId - Clerk user ID
 * @param repoName - Repository name to delete
 * @returns true if successful, throws error if fails
 */
export async function deleteRepo(userId: string, repoName: string): Promise<boolean> {
  const ACCESS_TOKEN = await GithubTokenExtract(userId);

  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    // Get user's GitHub username
    const userResponse = await axios.get("https://api.github.com/user", { headers });
    const username = userResponse.data.login;

    // Delete the repository
    const response = await axios.delete(
      `https://api.github.com/repos/${username}/${repoName}`,
      { headers }
    );

    if (response.status === 204) {
      return true; // Successfully deleted
    }

    throw new Error(`Failed to delete repo: ${response.status}`);
  } catch (error: any) {
    console.error("❌ Error deleting repo:", error.response?.data || error.message);
    throw error;
  }
}