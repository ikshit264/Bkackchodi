# Group Score Automation - Complete Implementation

This document outlines all the places where group scores are automatically recalculated when projects and courses are created, updated, completed, started, edited, or evaluated.

## Overview

Group scores are automatically recalculated whenever any of the following operations occur:
- **Project Creation** - When a new project is added
- **Project Updates** - When any project field is updated (status, description, etc.)
- **Project Status Changes** - When project status changes to "in progress", "completed", etc.
- **Project Evaluation** - When AI evaluation score is added/extracted
- **Project Started** - When a project is started via AI generation
- **Course Creation** - When a new course is created
- **Course Updates** - When course title, status, or other fields are updated
- **Course with Projects Creation** - When a course is created with batches and projects

## Implementation Details

### 1. Project Creation (`POST /api/query/project`)
**File:** `src/app/api/query/project/route.ts`
- **Trigger:** After creating a new project
- **Action:** Recalculates group score and global score if the project's course is associated with a group
- **Metrics Affected:** 
  - `projectsStarted` (incremented)

### 2. Project Update (`PATCH /api/query/project`)
**File:** `src/app/api/query/project/route.ts`
- **Trigger:** When any project field is updated
- **Special Handling:**
  - Extracts AI evaluation score from `GithubData` field
  - Automatically sets project status to "completed" when evaluation score is found
  - Sets `evaluatedAt` timestamp
- **Action:** Recalculates group score and global score
- **Metrics Affected:**
  - `projectsStarted` (may change if project count changes)
  - `projectsCompleted` (if status becomes "completed")
  - `totalAiEvaluationScore` (if AI score is added)
  - `averageCourseCompletion` (recalculated based on all projects in course)

### 3. Project Started via AI (`POST /api/ai/project`)
**File:** `src/app/api/ai/project/route.ts`
- **Trigger:** When a project is started through AI generation
- **Action:** Updates project status to "in progress" and recalculates scores
- **Metrics Affected:**
  - `projectsStarted` (incremented)

### 4. Course Creation (`POST /api/query/course`)
**File:** `src/app/api/query/course/route.ts`
- **Trigger:** When a new course is created
- **Action:** Recalculates group score and global score if course is associated with a group
- **Metrics Affected:**
  - `coursesStarted` (incremented)

### 5. Course Update (`PUT /api/query/course`)
**File:** `src/app/api/query/course/route.ts`
- **Trigger:** When course title or other fields are updated
- **Action:** Recalculates group score and global score
- **Metrics Affected:**
  - Course metadata (may affect completion calculations)

### 6. Course with Projects Creation (`POST /api/query/courseandprojects`)
**File:** `src/app/api/query/courseandprojects/route.ts`
- **Trigger:** When a course is created with batches and projects
- **Action:** Recalculates group score and global score after all data is created
- **Metrics Affected:**
  - `coursesStarted` (incremented)
  - `projectsStarted` (based on number of projects created)

### 7. Admin Course Update (`PUT /api/admin/courses`)
**File:** `src/app/api/admin/courses/route.ts`
- **Trigger:** When admin updates a course (status, title, userId, etc.)
- **Action:** Recalculates group score and global score
- **Metrics Affected:**
  - All metrics (full recalculation)

## Score Calculation Flow

1. **Trigger Event** → Project/Course operation occurs
2. **Check Group Association** → Verify if course is associated with a group
3. **Fetch User & Group IDs** → Extract userId and groupId from course/project data
4. **Recalculate Group Score** → Call `updateGroupScore(userId, groupId)`
   - Calculates:
     - `coursesStarted`
     - `averageCourseCompletion` (percentage)
     - `projectsStarted`
     - `projectsCompleted`
     - `totalAiEvaluationScore`
     - `finalScore` (weighted sum)
5. **Update Global Score** → Call `updateGlobalScore(userId)`
   - Calculates weighted combination of:
     - GitHub score (40%)
     - Sum of all group scores (60%)
6. **Update Ranks** → Automatically updates user ranks in the group

## Error Handling

All score recalculation operations are wrapped in try-catch blocks to ensure:
- **Non-blocking:** Score calculation errors don't fail the main operation
- **Logging:** Errors are logged for debugging
- **Graceful Degradation:** If score calculation fails, the original operation still succeeds

## Testing Recommendations

To verify score recalculation is working:

1. **Create a course in a group** → Check that `coursesStarted` increments
2. **Add projects to the course** → Check that `projectsStarted` increments
3. **Start a project** → Verify score updates
4. **Complete a project** → Check that `projectsCompleted` increments
5. **Evaluate a project** → Verify `aiEvaluationScore` is included and score recalculates
6. **Update project status** → Ensure score reflects new status
7. **Update course details** → Verify scores remain accurate

## Manual Recalculation

If needed, you can manually trigger score recalculation using:
- **POST `/api/groups/score/recalculate`** - Admin endpoint for manual recalculation

## Notes

- Score recalculation happens **asynchronously** in the background
- Multiple rapid updates may cause temporary inconsistencies (eventually consistent)
- For bulk operations, consider using the manual recalculation endpoint after completion
- All calculations use the weights defined in `GROUP_SCORE_WEIGHTS` and `GLOBAL_SCORE_WEIGHTS`


