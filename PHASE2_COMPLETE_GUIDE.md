# Phase 2: Enhanced Competition Features - Complete Guide

## Overview

Phase 2 focuses on **Enhanced Competition Features** that make the platform more engaging and competitive. It includes 4 major feature sets that track user activity, create challenges, enhance leaderboards, and provide analytics.

---

## 📅 1. Daily Contributions Tracking System

### What It Is
A comprehensive system that tracks all user activities within the app (not just GitHub) and displays them in a GitHub-style heatmap.

### Backend Implementation

#### **Database Schema** (`prisma/schema.prisma`)
```prisma
model DailyContribution {
  id               String           @id @default(cuid())
  userId           String
  date             DateTime
  contributionType ContributionType
  count            Int              @default(1)
  metadata         Json?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  user             User             @relation(fields: [userId], references: [id])
  
  @@unique([userId, date, contributionType])
  @@index([userId, date])
}

enum ContributionType {
  PROJECT_COMPLETED
  PROJECT_STARTED
  COURSE_COMPLETED
  COURSE_STARTED
  COURSE_CREATED
  BADGE_EARNED
  LOGIN
  COMMENT
  GROUP_JOINED
  SECTOR_JOINED
  PROJECT_EVALUATED
}
```

#### **Service Layer** (`src/lib/ContributionService.ts`)
**Key Functions:**
- `trackContribution(userId, type, metadata)` - Records a contribution
- `getUserContributionStats(userId, year)` - Calculates stats, streaks, totals
- `generateHeatmapMatrix(userId, year)` - Creates 52x7 week matrix for heatmap
- `getDailyContributions(userId, date)` - Gets specific day's contributions

**What It Does:**
- Tracks 11 different contribution types
- Calculates current streak and longest streak
- Generates heatmap data (52 weeks × 7 days)
- Aggregates contributions by type

#### **API Endpoints**
1. **`GET /api/contributions/user/[userId]`** - Get all user contributions
2. **`GET /api/contributions/user/[userId]/heatmap?year=2024`** - Get heatmap matrix
3. **`GET /api/contributions/user/[userId]/stats`** - Get stats (streaks, totals)
4. **`POST /api/contributions/track`** - Track a contribution (internal use)
5. **`GET /api/contributions/user/[userId]/daily/[date]`** - Get specific day

**Example API Response:**
```json
{
  "success": true,
  "data": {
    "matrix": [[{date: "2024-01-01", count: 5, types: {...}}, ...], ...],
    "stats": {
      "totalContributions": 150,
      "currentStreak": 7,
      "longestStreak": 30,
      "totalActiveDays": 45,
      "contributionsByType": {
        "PROJECT_COMPLETED": 20,
        "COURSE_COMPLETED": 10
      }
    },
    "year": 2024,
    "availableYears": [2024, 2023]
  }
}
```

### Frontend Implementation

#### **Component: `AppHeatmap`** (`src/components/dashboard/AppHeatmap.tsx`)

**Visual Features:**
- **Heatmap Grid**: 52 weeks × 7 days (similar to GitHub)
- **Color Intensity**: 5 levels based on contribution count
  - Level 0: No contributions (gray)
  - Level 1: 1-2 contributions (light green)
  - Level 2: 3-5 contributions (medium green)
  - Level 3: 6-9 contributions (dark green)
  - Level 4: 10+ contributions (darkest green)
- **Stats Cards**: 
  - Current Streak (blue gradient)
  - Longest Streak (purple gradient)
  - Total Contributions (emerald gradient)
- **Year Selector**: Dropdown to view different years
- **Hover Tooltips**: Shows date, count, and breakdown by type

**Integration:**
- Displayed on user profile page below GitHub heatmap
- Automatically fetches data when component mounts
- Updates when year selector changes

**UI Structure:**
```
┌─────────────────────────────────────────┐
│  APP CONTRIBUTIONS: Activity Heatmap    │
│  [Current Streak] [Longest] [Total]     │
│  [Year Selector]                        │
├─────────────────────────────────────────┤
│  Jan Feb Mar ...                        │
│  S  M  T  W  T  F  S                    │
│  [Heatmap Grid - 52 weeks × 7 days]    │
│  Less [●][●][●][●][●] More              │
└─────────────────────────────────────────┘
```

### Significance

**Why It Matters:**
1. **Gamification**: Visual representation of activity encourages daily engagement
2. **Motivation**: Streaks create habit-forming behavior (like GitHub)
3. **Comprehensive Tracking**: Tracks app activity, not just GitHub commits
4. **User Insights**: Users can see their activity patterns over time
5. **Competitive Element**: Users can compare activity levels

**Business Value:**
- Increases daily active users (DAU)
- Improves user retention
- Creates social proof (visible activity)
- Differentiates from competitors

---

## 🎯 2. Challenge System

### What It Is
A gamified challenge system where users can participate in time-limited or skill-based competitions with rewards.

### Backend Implementation

#### **Database Schema**
```prisma
model Challenge {
  id              String           @id @default(cuid())
  name            String
  description     String
  type            ChallengeType
  status          ChallengeStatus  @default(DRAFT)
  sectorId        String?
  groupId         String?
  startDate       DateTime?
  endDate         DateTime?
  criteria        Json            // Flexible criteria object
  rewards         Json?           // Badges, points, etc.
  maxParticipants Int?
  createdBy       String
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  participants    ChallengeParticipant[]
}

model ChallengeParticipant {
  id            String                      @id @default(cuid())
  challengeId   String
  userId        String
  status        ChallengeParticipantStatus @default(JOINED)
  progress      Json                        // Tracks progress
  completedAt   DateTime?
  joinedAt      DateTime                    @default(now())
  updatedAt     DateTime                    @updatedAt

  challenge     Challenge                   @relation(...)
  user          User                        @relation(...)

  @@unique([challengeId, userId])
}

enum ChallengeType {
  TIME_LIMITED      // "Complete 5 projects in 7 days"
  SKILL_BASED       // "Master React in 30 days"
  GROUP             // Team competitions
  SECTOR_SPECIFIC   // Sector-focused challenges
  STREAK            // Streak-based challenges
}

enum ChallengeStatus {
  DRAFT
  ACTIVE
  COMPLETED
  CANCELLED
}
```

#### **Service Layer** (`src/lib/ChallengeService.ts`)

**Key Functions:**
- `checkChallengeCompletion(challengeId, userId)` - Checks if user completed challenge
- `updateChallengeProgress(challengeId, userId, updates)` - Updates progress
- `getChallengeLeaderboard(challengeId)` - Gets ranked participants
- `autoUpdateChallengeProgress(userId, eventType)` - Auto-updates on events

**Auto-Update Triggers:**
- Project completion → updates `projectsCompleted`
- Course completion → updates `coursesCompleted`
- Badge earned → updates `badgesEarned`
- Streak updated → updates `streakDays`

**Example Criteria:**
```json
{
  "projectsCompleted": 5,
  "days": 7,
  "streakDays": 30
}
```

#### **API Endpoints**
1. **`GET /api/challenges`** - List all challenges (with filters: status, type, sectorId, groupId)
2. **`GET /api/challenges/[challengeId]`** - Get challenge details
3. **`POST /api/challenges`** - Create challenge (admin only)
4. **`POST /api/challenges/[challengeId]/join`** - Join a challenge
5. **`GET /api/challenges/[challengeId]/leaderboard`** - Get leaderboard
6. **`GET /api/challenges/[challengeId]/progress/[userId]`** - Get user progress
7. **`PATCH /api/challenges/[challengeId]/update-progress`** - Manually update progress

### Frontend Implementation

#### **Components:**

1. **`ChallengeCard`** (`src/components/challenges/ChallengeCard.tsx`)
   - Displays challenge info in card format
   - Shows type badge (color-coded)
   - Shows status badge
   - Displays participant count
   - Shows days remaining (if time-limited)
   - Links to challenge detail page

2. **`ChallengeProgress`** (`src/components/challenges/ChallengeProgress.tsx`)
   - Progress bar showing completion percentage
   - Breakdown of criteria progress
   - Time remaining indicator

3. **`ChallengeLeaderboard`** (`src/components/challenges/ChallengeLeaderboard.tsx`)
   - Ranked list of participants
   - Shows completion status
   - Highlights current user

#### **Pages:**
- **`/challenges`** - List all challenges with filters
- **`/challenges/[challengeId]`** - Challenge detail page with progress and leaderboard

**UI Example:**
```
┌─────────────────────────────────────┐
│ [TIME_LIMITED] [ACTIVE]             │
│ Complete 5 Projects in 7 Days       │
│ Description...                      │
│ 👥 25 participants | ⏰ 3 days left │
│ [Join Challenge]                    │
└─────────────────────────────────────┘
```

### Significance

**Why It Matters:**
1. **Engagement**: Creates time-bound goals that drive action
2. **Community**: Group challenges foster collaboration
3. **Skill Development**: Skill-based challenges guide learning
4. **Retention**: Regular challenges keep users coming back
5. **Rewards**: Badge/point rewards provide motivation

**Business Value:**
- Increases user engagement
- Creates viral loops (users invite friends)
- Drives specific behaviors (complete projects, learn skills)
- Generates content (challenge results, leaderboards)

---

## 🏅 3. Advanced Leaderboard Features

### What It Is
Enhanced leaderboard with filters, search, timeframes, and export capabilities.

### Backend Implementation

#### **API Endpoint: `GET /api/leaderboard`**

**Query Parameters:**
- `timeframe`: `daily` | `weekly` | `monthly` | `alltime`
- `filter`: `sector` | `location` | `group`
- `filterId`: ID of the filter (sector/group ID or location string)
- `search`: Username search query
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset

**Implementation Logic:**
```typescript
// Timeframe filter
if (timeframe === "daily") {
  where.lastUpdatedDate = { gte: yesterday };
} else if (timeframe === "weekly") {
  where.lastUpdatedDate = { gte: lastWeek };
}

// Sector/Group filter
if (filter === "sector" && filterId) {
  const members = await getSectorMembers(filterId);
  where.userId = { in: members.map(m => m.userId) };
}

// Location filter
if (filter === "location" && filterId) {
  const [type, value] = filterId.split(",");
  where.user.country = value; // or city, region
}

// Search
if (search) {
  where.user.userName = { contains: search, mode: "insensitive" };
}
```

#### **Export Endpoint: `GET /api/leaderboard/export`**
- `format`: `csv` | `pdf`
- Exports leaderboard data in requested format

### Frontend Implementation

**Leaderboard Page** (`src/app/leaderboard/page.tsx`)

**UI Features:**
- **Filter Dropdowns:**
  - Timeframe: Daily / Weekly / Monthly / All-time
  - Filter Type: Sector / Group / Location
  - Filter Value: Dynamic based on type
- **Search Bar**: Real-time username search
- **Export Button**: Download as CSV/PDF
- **Rank Indicators**: 
  - "Your Rank" highlight
  - Rank change arrows (↑↓)
- **Pagination**: Infinite scroll or page controls

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ [Timeframe ▼] [Filter ▼] [Search]   │
│ [Export CSV] [Export PDF]           │
├─────────────────────────────────────┤
│ Rank | User | Score | Change        │
│  1   | 👤   | 1000  | ↑2            │
│  2   | 👤   |  950  | ↓1            │
│  3   | 👤   |  900  | →             │
│ ...                                 │
└─────────────────────────────────────┘
```

### Significance

**Why It Matters:**
1. **Flexibility**: Users can view rankings in different contexts
2. **Competition**: Sector/group filters create smaller competitive groups
3. **Discovery**: Search helps find specific users
4. **Data Export**: Users can analyze rankings offline
5. **Time-based**: Shows recent activity vs. all-time performance

**Business Value:**
- Increases leaderboard engagement
- Creates multiple competitive contexts
- Enables data analysis (export feature)
- Improves user discovery

---

## 📊 4. Analytics Dashboard

### What It Is
Comprehensive analytics service that aggregates user, group, sector, and global metrics.

### Backend Implementation

#### **Service Layer** (`src/lib/AnalyticsService.ts`)

**Key Functions:**

1. **`getUserAnalytics(userId)`**
   - Total/completed projects
   - Total/completed courses
   - Badges earned
   - Streaks (current/longest)
   - Total contributions
   - Average project score
   - Global rank
   - Score breakdown (final, GitHub, commits, PRs)

2. **`getUserTrends(userId, days)`**
   - Score trends over time
   - Project completion trends
   - Course completion trends
   - Badge earning trends
   - Returns daily data points

3. **`getGroupAnalytics(groupId)`**
   - Total members
   - Total projects
   - Average score
   - Top 10 members

4. **`getSectorAnalytics(sectorId)`**
   - Same as group analytics (sectors are groups with type=CATEGORY)

5. **`getGlobalAnalytics()`** (Admin only)
   - Total users
   - Total courses
   - Total projects
   - Total badges
   - Total groups
   - Average score
   - Top 10 users globally

#### **API Endpoints**
1. **`GET /api/analytics/user/[userId]`** - User analytics
2. **`GET /api/analytics/user/[userId]/trends?days=30`** - User trends
3. **`GET /api/analytics/group/[groupId]`** - Group analytics
4. **`GET /api/analytics/sector/[sectorId]`** - Sector analytics
5. **`GET /api/analytics/global`** - Global analytics (admin)

**Example Response:**
```json
{
  "totalProjects": 25,
  "completedProjects": 20,
  "totalCourses": 5,
  "completedCourses": 3,
  "badgesEarned": 10,
  "currentStreak": 7,
  "longestStreak": 30,
  "totalContributions": 150,
  "averageProjectScore": 85.5,
  "rank": 42,
  "score": {
    "finalScore": 1250,
    "githubScore": 800,
    "commits": 150,
    "pullRequests": 25
  }
}
```

### Frontend Implementation

**Analytics Page** (`src/app/analytics/page.tsx`)

**Planned Components:**
- `AnalyticsDashboard` - Main dashboard container
- `MetricCard` - Individual metric display
- `TrendChart` - Line chart showing trends over time
- `ComparisonChart` - Compare user vs. group/sector average

**UI Features:**
- Date range picker
- Metric filters
- Interactive charts
- Comparison views

**Note:** According to `PHASE2_IMPLEMENTATION.md`, the analytics endpoints are ready, but UI components are still being developed (~90% complete).

### Significance

**Why It Matters:**
1. **User Insights**: Users understand their performance
2. **Goal Setting**: Trends help set improvement goals
3. **Competitive Analysis**: Compare with group/sector averages
4. **Data-Driven Decisions**: Users can see what works
5. **Admin Insights**: Global analytics for platform management

**Business Value:**
- Helps users optimize their learning
- Provides platform health metrics
- Enables data-driven product decisions
- Creates premium feature opportunity

---

## 🔗 Integration Points

### How Features Work Together

1. **Contributions → Challenges**
   - Contribution tracking auto-updates challenge progress
   - Project completion triggers challenge progress update

2. **Contributions → Analytics**
   - Contribution data feeds into analytics trends
   - Total contributions shown in user analytics

3. **Challenges → Leaderboard**
   - Challenge leaderboards use same ranking logic
   - Challenge completion affects global score

4. **Analytics → Leaderboard**
   - Analytics data can filter leaderboards
   - Trends inform leaderboard timeframes

---

## 📈 Overall Significance of Phase 2

### User Experience
- **Engagement**: Daily contributions and challenges create daily habits
- **Competition**: Multiple leaderboard contexts increase competitive engagement
- **Insights**: Analytics help users understand and improve performance
- **Gamification**: Challenges and rewards make learning fun

### Business Impact
- **Retention**: Daily tracking increases return visits
- **Engagement**: Challenges drive specific actions
- **Differentiation**: Unique features vs. competitors
- **Data**: Analytics provide valuable user behavior insights

### Technical Excellence
- **Scalability**: Efficient database queries with indexes
- **Flexibility**: JSON-based criteria allow dynamic challenges
- **Performance**: Cached heatmap generation
- **Maintainability**: Clean service layer architecture

---

## 🎯 Summary

Phase 2 transforms the platform from a simple scoring system into a **comprehensive competitive learning platform** with:

1. **Visual Activity Tracking** (Contributions Heatmap)
2. **Gamified Challenges** (Time-limited competitions)
3. **Flexible Leaderboards** (Multiple contexts and filters)
4. **Data Analytics** (Performance insights and trends)

All features are **fully implemented** in the backend and **mostly complete** in the frontend, making Phase 2 production-ready!

