# Badge System Guide

## Overview

The badge system is now LeetCode-style with milestone-based achievements. Badges are automatically calculated and can be manually refreshed.

## Features

### 1. **Refresh Button**
- Located in the badge collection page
- Manually triggers badge calculation for all badges
- Shows progress and results after calculation
- Use this if badges aren't being awarded automatically

### 2. **Badge Images**
- Badges can have images (URL) or icons (emoji)
- Images are primary, icons are fallback
- If image fails to load, automatically falls back to icon

### 3. **LeetCode-Style Milestones**
Badges are organized by milestones:

**Projects:**
- First Steps (1 project)
- 10 Projects
- 50 Projects
- 100 Projects
- 200 Projects

**Streaks:**
- 7 Day Streak
- 30 Day Streak
- 100 Day Streak
- 200 Day Streak
- 365 Day Streak (1 year!)

**GitHub:**
- 100 Commits
- 500 Commits
- 1000 Commits
- 50 Pull Requests
- 100 Pull Requests
- Code Reviewer (50 reviews)

**Other:**
- Welcome! (awarded on account creation)
- Group Champion (top 10 in any group)
- Course Completer (5 courses)
- Top 100/10 (global rankings)
- Perfect Score (100/100 on any project)

### 4. **Admin Badge Templates**

Admins can create custom badges using:

**API Endpoint:** `POST /api/admin/badge-templates`

**Options:**
1. **Natural Language Query** (AI-powered):
   ```json
   {
     "name": "500 Day Streak",
     "description": "Maintain a 500-day streak",
     "image": "https://example.com/badge.png",
     "category": "STREAKS",
     "rarity": "LEGENDARY",
     "naturalLanguageQuery": "Badge for 500 day streak"
   }
   ```

2. **Manual Criteria**:
   ```json
   {
     "name": "Custom Badge",
     "description": "Complete 25 projects",
     "category": "PROJECTS",
     "rarity": "RARE",
     "conditionType": "projects_completed",
     "conditionValue": { "count": 25 },
     "criteria": { "projectsCompleted": 25 }
   }
   ```

### 5. **Available Metrics**

The system tracks these metrics for badge eligibility:

- `streak`: Current streak in days
- `longestStreak`: Longest streak achieved
- `totalActiveDays`: Total active days
- `commits`: Total GitHub commits
- `pullRequests`: Total pull requests
- `reviews`: Total code reviews
- `issues`: Total issues
- `projectsCompleted`: Completed projects count
- `projectsStarted`: Started projects count
- `coursesCompleted`: Completed courses count
- `coursesStarted`: Started courses count
- `globalRank`: Global rank (lower is better)
- `groupRank`: Best group rank
- `perfectScore`: Has any project with 100/100 score
- `loginDays`: Days since account creation
- `consecutiveLoginDays`: Consecutive login days (uses streak)

## How Badges Are Calculated

1. **Automatic**: When scores update or projects complete
2. **Manual**: Click "Refresh Badges" button
3. **On Account Creation**: Welcome badge is automatically checked

## Filter Options

- **Category Filter**: Filter by Projects, Streaks, GitHub, Group, Course, Milestone
- **View Toggle**: Switch between "Earned" and "Available" badges
- Available badges show progress bars

## Badge Rarity

- **COMMON**: Easy to achieve (gray)
- **RARE**: Moderate difficulty (blue)
- **EPIC**: Hard to achieve (purple)
- **LEGENDARY**: Very hard to achieve (gold/yellow)

## Troubleshooting

If badges aren't being awarded:

1. Click "Refresh Badges" button
2. Check that your metrics meet the criteria
3. Verify badge exists in database (admin can check)
4. Check console for errors

## Admin Features

Admins can:
- Create badge templates via API
- Use AI to parse natural language into criteria
- Define custom conditions and thresholds
- Upload badge images
- Set badge categories and rarities











