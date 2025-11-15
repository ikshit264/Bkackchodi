# Daily Streak System - Complete Guide

## Overview

The application tracks **two types of streaks**:

1. **GitHub Streak** - Based on GitHub contributions (commits, PRs, issues, reviews)
2. **App Contribution Streak** - Based on app activities (projects, courses, badges, etc.)

Both streaks work independently but are displayed together in your profile.

---

## How Streaks Work

### Current Implementation

Currently, **streaks are primarily calculated from GitHub data** when you:
- Make commits
- Open pull requests
- Open issues
- Review pull requests

### Streak Calculation Logic

Streaks are calculated from **consecutive days with at least one contribution**:

1. **Current Streak**: Counts backward from today/yesterday
   - If you contributed today → counts from today backward
   - If you contributed yesterday but not today → counts from yesterday backward
   - Stops when it finds a gap (missing day)

2. **Longest Streak**: The maximum consecutive days you've ever contributed
   - Calculated by going through all your contribution dates
   - Finds the longest sequence of consecutive days

### Code Location

The streak calculation happens in:
- `src/lib/BackendHelpers.ts` - `streaks()` function (lines 95-117)
- Uses GitHub contribution calendar data
- Processes dates to find consecutive sequences

---

## How to Update Your Streak

### Method 1: GitHub Contributions (Primary Method)

**What counts:**
- ✅ Commits to repositories
- ✅ Opening pull requests
- ✅ Opening issues
- ✅ Reviewing pull requests

**How it updates:**
1. When you visit your profile or the app fetches your score
2. The app calls GitHub API to get your contribution data
3. Streaks are recalculated from your GitHub contribution calendar
4. Updated in the database automatically

**Trigger points:**
- Visiting `/api/query/score` endpoint
- Profile page loads (fetches score data)
- Manual refresh via "Refetch Rank" button

### Method 2: App Contributions (Phase 2 - New!)

**What counts (tracked automatically):**
- ✅ Completing a project (`PROJECT_COMPLETED`)
- ✅ Starting a project (`PROJECT_STARTED`)
- ✅ Completing a course (`COURSE_COMPLETED`)
- ✅ Starting a course (`COURSE_STARTED`)
- ✅ Creating a course (`COURSE_CREATED`)
- ✅ Earning a badge (`BADGE_EARNED`)
- ✅ Joining a group/sector (`GROUP_JOINED`, `SECTOR_JOINED`)

**How it updates:**
1. When you perform any of the above actions
2. A `DailyContribution` record is created/updated for today
3. The app contribution streak is calculated separately
4. Currently displayed in the App Heatmap component

**Note:** App contribution streaks are calculated in `ContributionService.ts` but are **separate from GitHub streaks** stored in the Score model.

---

## Current Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER ACTION                           │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌──────────────────┐
│ GitHub Action │              │  App Action      │
│ (Commit/PR)   │              │ (Project/Course) │
└───────────────┘              └──────────────────┘
        │                               │
        ▼                               ▼
┌───────────────┐              ┌──────────────────┐
│ GitHub API    │              │ Track Contribution│
│ Fetch Data    │              │ (DailyContribution)│
└───────────────┘              └──────────────────┘
        │                               │
        ▼                               ▼
┌───────────────┐              ┌──────────────────┐
│ Calculate     │              │ Calculate        │
│ GitHub Streak │              │ App Streak       │
│ (BackendHelpers)│            │ (ContributionService)│
└───────────────┘              └──────────────────┘
        │                               │
        └───────────────┬───────────────┘
                        ▼
              ┌──────────────────┐
              │  Update Score    │
              │  (currentStreak, │
              │   longestStreak) │
              └──────────────────┘
```

---

## Important Notes

### ⚠️ Current Limitation

**The Score model's `currentStreak` and `longestStreak` fields are currently ONLY updated from GitHub data**, not from app contributions.

### 🔄 How to Update Your GitHub Streak

1. **Make a GitHub contribution** (commit, PR, issue, review)
2. **Wait for GitHub to process** (usually within minutes)
3. **Trigger a score refresh** by:
   - Visiting your profile page
   - Clicking "Refetch Rank" button
   - The app will fetch latest GitHub data and recalculate streaks

### 📊 App Contribution Streaks

App contribution streaks are tracked separately and shown in the **App Heatmap** component. They are calculated from `DailyContribution` records but are **not yet merged into the main Score model**.

---

## Recommended Improvements

To make streaks work with app contributions, you would need to:

1. **Merge App Streaks with GitHub Streaks**
   - Combine both contribution types when calculating streaks
   - Update Score model with combined streak values

2. **Automatic Daily Updates**
   - Add a scheduled job to check and update streaks daily
   - Or update streaks when any contribution is tracked

3. **Login Tracking**
   - Track `LOGIN` contributions when users log in
   - This would help maintain streaks even without GitHub activity

---

## Code References

- **GitHub Streak Calculation**: `src/lib/BackendHelpers.ts` (lines 94-127)
- **App Streak Calculation**: `src/lib/ContributionService.ts` (lines 99-165)
- **Score Update**: `src/lib/GlobalScoreCalculator.ts`
- **Contribution Tracking**: `src/lib/ContributionService.ts` (`trackContribution()`)
- **Score Fetching**: `src/app/api/query/score/route.ts`

---

## Summary

**To update your streak:**
1. Make GitHub contributions (commits, PRs, issues, reviews) OR
2. Complete projects/courses in the app (tracks app streak separately)
3. Visit your profile or refresh your score
4. Streaks are automatically recalculated and updated

**Current behavior:**
- GitHub streaks → Updated in Score model (main streak)
- App streaks → Tracked separately, shown in App Heatmap

**Future enhancement needed:**
- Merge both streak types into a unified streak system












