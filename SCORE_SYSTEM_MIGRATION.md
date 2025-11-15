# Score Calculation System Migration Guide

## Overview
The score calculation system has been completely revamped to support:
1. **Global Score**: Weighted combination of GitHub Score + Sum of Group Scores
2. **Group Score**: Separate score calculation per group based on course/project progress and AI evaluations

## Schema Changes

### Project Model
- Added `aiEvaluationScore Float?` - Stores AI evaluation score (0-100)
- Added `evaluatedAt DateTime?` - Timestamp when project was evaluated

### GroupScore Model
- **Removed**: Old fields that mirrored global Score (totalActiveDays, commits, PRs, etc.)
- **Added**: New group-specific calculation fields:
  - `coursesStarted Int` - Number of courses started in this group
  - `averageCourseCompletion Float` - Average percentage of course completion
  - `projectsStarted Int` - Number of projects started
  - `projectsCompleted Int` - Number of projects completed (after evaluation)
  - `totalAiEvaluationScore Float` - Sum of all AI evaluation scores
  - `finalScore Int` - Weighted final score for this group

### Score Model (Global)
- Added `githubScore Int` - Separated GitHub-based score
- `finalScore` now represents: `weighted(GitHub Score + Sum of Group Scores)`

## Calculation Formulas

### Group Score Calculation
```typescript
Group Score = 
  (coursesStarted × 50) +
  (averageCourseCompletion × 2) +
  (projectsStarted × 30) +
  (projectsCompleted × 100) +
  (totalAiEvaluationScore × 1)
```

**Weights** (configurable in `src/lib/GroupScoreCalculator.ts`):
- Courses Started: 50 points per course
- Course Completion: 2 points per percentage point
- Projects Started: 30 points per project
- Projects Completed: 100 points per project
- AI Evaluation Score: 1 point per evaluation point

### Global Score Calculation
```typescript
Global Score = 
  (GitHub Score × 0.4) +
  (Sum of All Group Scores × 0.6)
```

**Weights** (configurable in `src/lib/GlobalScoreCalculator.ts`):
- GitHub Score: 40%
- Group Scores: 60%

## New Files Created

1. **`src/lib/GroupScoreCalculator.ts`**
   - `calculateGroupScore()` - Calculates group score for a user
   - `updateGroupScore()` - Updates/creates GroupScore record
   - `recalculateGroupScores()` - Recalculates all users in a group
   - `updateGroupRanks()` - Updates leaderboard ranks

2. **`src/lib/GlobalScoreCalculator.ts`**
   - `calculateGlobalScore()` - Calculates global score (GitHub + Groups)
   - `updateGlobalScore()` - Updates global Score record

3. **`src/app/api/groups/score/recalculate/route.ts`**
   - Manual score recalculation endpoint

## Updated Files

1. **`prisma/schema.prisma`** - Schema changes as described above
2. **`src/lib/BackendHelpers.ts`** - Now saves `githubScore` separately and calls `updateGlobalScore()`
3. **`src/lib/GroupScoreSync.ts`** - Updated to use new `GroupScoreCalculator`
4. **`src/app/api/query/project/route.ts`** - Extracts AI score from GithubData and triggers recalculation
5. **`src/app/api/query/course/route.ts`** - Triggers score recalculation on course create/update
6. **`src/app/api/query/courseandprojects/route.ts`** - Triggers score recalculation after course creation

## Migration Steps

### 1. Run Prisma Migration
```bash
npx prisma migrate dev --name update_score_calculation_system
```

### 2. Recalculate Existing Scores
After migration, you'll need to recalculate all existing scores:

```typescript
// Option 1: Recalculate via API
POST /api/groups/score/recalculate
{
  "allGroups": true
}

// Option 2: Use admin endpoint (if available)
// Or create a script to iterate through all users
```

### 3. Extract AI Scores from Existing Projects
Existing projects may have evaluation data in `GithubData` but not in `aiEvaluationScore`. You may want to create a migration script to:
- Parse `GithubData` JSON
- Extract `Final Score` or `final_score`
- Update `aiEvaluationScore` field

## How It Works

### Automatic Score Updates
Scores are automatically recalculated when:
1. **Project Status Changes**: When a project is evaluated (GithubData updated with score), the AI score is extracted and stored
2. **Project Completed**: When project status changes to "completed"
3. **Course Created/Updated**: When a course is created or updated with a groupId
4. **GitHub Score Updates**: When GitHub data is fetched, global score is recalculated

### Manual Score Updates
Use the recalculation endpoint:
```bash
POST /api/groups/score/recalculate
{
  "userId": "optional-user-id",  # defaults to current user
  "groupId": "optional-group-id", # recalculate specific group
  "allGroups": true               # recalculate all groups for user
}
```

## Important Notes

1. **Backward Compatibility**: Old `GroupScoreSync` functions still work but now use the new calculation method
2. **Project Evaluation**: When a project's `GithubData` is updated with evaluation results, the system automatically:
   - Extracts the `Final Score` from the JSON
   - Stores it in `aiEvaluationScore`
   - Sets `evaluatedAt` timestamp
   - Marks project as "completed" (if status not set)
   - Triggers score recalculation

3. **Weight Configuration**: All weights are configurable in the calculator files. Adjust as needed for your use case.

4. **Performance**: Score calculations are performed asynchronously and won't block API requests if they fail.

## Testing

1. Create a course in a group
2. Start projects in that course
3. Evaluate a project (update GithubData with evaluation result)
4. Check that:
   - `Project.aiEvaluationScore` is set
   - `GroupScore` is updated with new values
   - `Score.finalScore` reflects the weighted combination


