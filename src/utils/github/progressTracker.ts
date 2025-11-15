/**
 * Progress tracking system for GitHub operations
 */

export type ProgressStage = 
  | "initializing"
  | "sending_to_ai"
  | "parsing_data"
  | "getting_project_info"
  | "preparing_github"
  | "creating_repo"
  | "repo_created"
  | "creating_project"
  | "project_created"
  | "creating_issues"
  | "issue_created"
  | "bulk_creating_issues"
  | "adding_to_project"
  | "completed"
  | "error";

export interface ProgressUpdate {
  stage: ProgressStage;
  message: string;
  current?: number;
  total?: number;
  error?: string;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * Helper to create progress updates
 */
export function createProgressUpdate(
  stage: ProgressStage,
  message: string,
  current?: number,
  total?: number,
  error?: string
): ProgressUpdate {
  return { stage, message, current, total, error };
}

