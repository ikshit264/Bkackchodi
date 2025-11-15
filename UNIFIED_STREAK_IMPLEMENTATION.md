# Unified Streak System - Implementation Summary

## Overview

The streak system has been streamlined to combine GitHub contributions and App contributions into a unified streak calculation. GitHub contributions have higher weight (1.0) while app activities count with lower weight (0.5), ensuring both sources contribute to maintaining streaks.

## Key Features

### 1. **Unified Streak Calculation**
- **GitHub Contributions**: Weight = 1.0 (commits, PRs, issues, reviews)
- **App Contributions**: Weight = 0.5 (projects, courses, badges, logins, etc.)
- **Combined Streak**: Days with total weight >= 0.5 count as active days

### 2. **Separate Analytics**
- **GitHub Score**: Calculated separately using GitHub-only streaks (for analytics)
- **App Streak**: Tracked separately (for analytics)
- **Combined Streak**: Used in Score model for overall scoring

### 3. **Login Tracking**
- Login/signin is automatically tracked as `LOGIN` contribution
- **Login is a boolean** - either you logged in that day or not
- Multiple logins in a day don't increment count (it's always 1 if logged in)
- Tracked when:
  - User accesses course API (`/api/query/course`)
  - User fetches score (`/api/query/score`)
  - User performs any authenticated action

### 4. **Activity Logging**
- All activities are logged in `DailyContribution` table
- Each activity includes:
  - Type (PROJECT_COMPLETED, COURSE_CREATED, LOGIN, etc.)
  - Count (number of times on that day)
  - Metadata (project ID, course ID, badge ID, etc.)
  - Timestamp

## Implementation Details

### Files Created/Modified

#### New Files:
1. **`src/lib/UnifiedStreakService.ts`**
   - `calculateUnifiedStreaks()`: Combines GitHub + App contributions
   - `trackLogin()`: Tracks user login
   - `getDailyActivities()`: Get activities for a specific day
   - `getActivityLog()`: Get activity log for a date range

2. **`src/lib/LoginTrackingHelper.ts`**
   - `trackUserLogin()`: Centralized login tracking helper

3. **`src/app/api/contributions/user/[userId]/activities/route.ts`**
   - API endpoint to fetch detailed activity logs

#### Modified Files:
1. **`src/lib/BackendHelpers.ts`**
   - Updated `processCalendar()` to return `githubContributionDates`
   - Updated `fullOrPartialScoreFetch()` to:
     - Calculate unified streaks (GitHub + App)
     - Store unified streaks in Score model
     - Calculate GitHub score separately with GitHub-only streaks
     - Return both GitHub and App streak values

2. **`src/lib/GlobalScoreCalculator.ts`**
   - Updated comments to clarify GitHub score uses unified streaks (acceptable since GitHub has higher weight)

3. **`src/app/api/query/course/route.ts`**
   - Added login tracking in `ensureUserExists()` for existing users

4. **`src/app/api/query/score/route.ts`**
   - Added login tracking when user fetches score

## Activity Tracking

### Tracked Activities:
1. ✅ **PROJECT_COMPLETED** - When a project is marked complete
2. ✅ **PROJECT_STARTED** - When a project status changes from "not started"
3. ✅ **COURSE_COMPLETED** - When a course is completed
4. ✅ **COURSE_STARTED** - When a course is started
5. ✅ **COURSE_CREATED** - When a course is created
6. ✅ **BADGE_EARNED** - When a badge is awarded
7. ✅ **LOGIN** - When user logs in/signs in
8. ✅ **COMMENT** - When user comments (if implemented)
9. ✅ **GROUP_JOINED** - When user joins a group
10. ✅ **SECTOR_JOINED** - When user joins a sector
11. ✅ **PROJECT_EVALUATED** - When a project is evaluated

### Where Activities Are Tracked:

- **Project Completion**: `src/app/api/query/project/route.ts`
- **Course Creation**: `src/app/api/query/course/route.ts`, `src/app/api/query/courseandprojects/route.ts`
- **Badge Earning**: `src/lib/BadgeService.ts`
- **Group/Sector Join**: `src/app/api/groups/join/route.ts`
- **Login**: `src/app/api/query/course/route.ts`, `src/app/api/query/score/route.ts`

## Streak Calculation Flow

```
1. User performs action (GitHub commit OR App activity)
   ↓
2. Activity tracked in DailyContribution table
   ↓
3. When score is fetched/updated:
   a. Fetch GitHub contribution dates from GitHub API
   b. Fetch App contribution dates from DailyContribution
   c. Combine with weights (GitHub=1.0, App=0.5)
   d. Calculate unified streaks (current, longest)
   ↓
4. Update Score model:
   - currentStreak: Unified streak (GitHub + App)
   - longestStreak: Unified streak (GitHub + App)
   - githubScore: Calculated with GitHub-only streaks (for analytics)
   ↓
5. Return both values:
   - githubStreak: GitHub-only streak (for analytics)
   - appStreak: App-only streak (for analytics)
   - currentStreak: Combined streak (for scoring)
```

## API Endpoints

### Get Activity Log
```
GET /api/contributions/user/[userId]/activities?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/contributions/user/[userId]/activities?days=30
```

Returns:
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "activities": [
        {
          "type": "LOGIN",
          "count": 3,
          "metadata": { "timestamp": "...", "source": "authentication" }
        },
        {
          "type": "PROJECT_COMPLETED",
          "count": 1,
          "metadata": { "projectId": "...", "projectTitle": "..." }
        }
      ],
      "totalContributions": 4
    }
  ]
}
```

## How to Update Your Streak

### Method 1: GitHub Contributions
1. Make commits, PRs, issues, or reviews on GitHub
2. Visit your profile or fetch score
3. Streak automatically updates

### Method 2: App Activities
1. Complete projects, courses
2. Earn badges
3. Join groups/sectors
4. **Just log in** (counts as activity!)
5. Streak automatically updates

### Combined
- Both GitHub and App activities count
- GitHub has higher weight (1.0) but App activities (0.5) also maintain streak
- A day counts if you have either GitHub activity OR app activity

## Database Schema

### DailyContribution Table
```prisma
model DailyContribution {
  id                String            @id @default(uuid())
  userId            String
  date              DateTime          @db.Date
  contributionType  ContributionType
  count             Int               @default(1)
  metadata          Json?             // Activity details
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}
```

### Score Table
```prisma
model Score {
  currentStreak   Int  // Unified streak (GitHub + App)
  longestStreak   Int  // Unified streak (GitHub + App)
  githubScore     Int  // Calculated with GitHub-only streaks
  // ... other fields
}
```

## Testing

To verify the implementation:

1. **Check Login Tracking**:
   - Log in to the app
   - Check `/api/contributions/user/[userId]/activities?days=1`
   - Should see `LOGIN` activity

2. **Check Unified Streaks**:
   - Make a GitHub commit
   - Complete a project in the app
   - Fetch score - should see unified streak updated

3. **Check Activity Logs**:
   - Perform various activities
   - Check activity log endpoint
   - Should see all activities with metadata

## Future Enhancements

1. **Real-time Streak Updates**: Update streaks immediately when activities occur
2. **Streak Notifications**: Notify users when streak is about to break
3. **Streak Milestones**: Badges for streak milestones (already implemented)
4. **Streak Leaderboards**: Leaderboards based on current/longest streaks
5. **Activity Dashboard**: Visual dashboard showing all activities

## Notes

- Login tracking is non-blocking (won't fail requests if tracking fails)
- Unified streaks are calculated on-demand (when score is fetched)
- GitHub score is calculated separately for analytics purposes
- App contributions have lower weight (0.5) but still count toward streaks
- All activities are logged with metadata for detailed tracking

