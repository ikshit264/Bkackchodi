/**
 * TypeScript types for Group functionality
 */

export interface CoursePreview {
  id: string;
  title: string;
  status: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  creatorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  userRank?: number;
  userScore?: number;
  courses?: CoursePreview[];
}

export interface GroupMembership {
  id: string;
  userId: string;
  groupId: string;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface GroupScore {
  id: string;
  userId: string;
  groupId: string;
  // New group-specific score calculation components
  coursesStarted: number;
  averageCourseCompletion: number;
  projectsStarted: number;
  projectsCompleted: number;
  totalAiEvaluationScore: number;
  finalScore: number;
  rank: number | null;
  lastUpdatedDate: Date;
  updatedAt: Date;
}

export interface UserGroupWithScore extends Group {
  groupScore: GroupScore | null;
  membership: GroupMembership | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  name: string;
  avatar: string | null;
  finalScore: number;
  commits: number;
  pullRequests: number;
  review: number;
  issue: number;
  contribution: number;
  scoreId?: string; // For pagination cursor
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}

