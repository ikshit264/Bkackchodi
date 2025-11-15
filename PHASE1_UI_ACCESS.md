# Phase 1 Features - UI Access Guide

## 📍 Where to Access Phase 1 Features

### ✅ 1. Badge System

**Location:** User Profile Page
- **Path:** `/{yourUsername}/profile`
- **Section:** "Badges & Achievements" card
- **Features:**
  - View all earned badges
  - See available badges with progress
  - Filter badges by category (Projects, Streaks, GitHub, Group, Course, Milestone)
  - Toggle between "Earned" and "Available" badges

**How to Access:**
1. Click on your profile in the sidebar (Home icon)
2. Scroll down to the "Badges & Achievements" section
3. Browse your badges or check progress on available ones

**Badge Notifications:**
- Badges are automatically awarded when you complete projects
- You'll receive a notification when you earn a badge
- Check the notifications page to see badge awards

---

### ✅ 2. Sector/Category-Based Competition

**Location 1:** Sectors Page (Browse & Join)
- **Path:** `/sectors`
- **Features:**
  - View all available sectors (Web Dev, AI/ML, Mobile, DevOps, etc.)
  - See member count and course count for each sector
  - Join sectors you're interested in
  - View your rank and score in joined sectors

**Location 2:** Sector Leaderboard Page
- **Path:** `/sectors/{sectorId}`
- **Features:**
  - View sector leaderboard
  - See your rank in the sector
  - Compare with other members

**How to Access:**
1. Click "Sectors" in the sidebar navigation
2. Browse available sectors
3. Click "Join Sector" on any sector you want to join
4. Click on a sector card to view its leaderboard

**Navigation:**
- Sidebar → "Sectors" link (newly added)

---

### ✅ 3. Enhanced Performance Tracking

**Location:** User Profile Page
- **Path:** `/{yourUsername}/profile`
- **Section:** "Performance Analytics" card
- **Features:**
  - View final score, GitHub score, and current streak
  - See detailed GitHub activity (commits, PRs, reviews, issues)
  - View strengths and areas for improvement
  - Get personalized recommendations

**How to Access:**
1. Go to your profile page
2. Scroll to the "Performance Analytics" section
3. View your metrics and analysis

**API Endpoints Available (for future UI):**
- Compare with another user: `/api/performance/{userId}/compare/{otherUserId}`
- View trends: `/api/performance/{userId}/trends`
- Compare with group: `/api/performance/{userId}/vs-group?groupId={groupId}`
- Get strengths/weaknesses: `/api/performance/{userId}/strengths-weaknesses`

---

### ✅ 4. Local/Regional Leaderboards

**Location 1:** Profile Settings (Update Location)
- **Path:** `/{yourUsername}/profile`
- **Section:** "Profile Settings" → "Other Details"
- **Fields:**
  - Country
  - City
  - Region
  - Timezone

**Location 2:** Leaderboard API Endpoints (Ready for UI)
- Country Leaderboard: `/api/leaderboard/country/{country}`
- City Leaderboard: `/api/leaderboard/city/{city}`
- Popular Locations: `/api/locations/popular`

**How to Access:**
1. Go to your profile page
2. Scroll to "Profile Settings"
3. Fill in your location information (Country, City, Region, Timezone)
4. Save your profile

**Note:** Location-based leaderboard UI pages can be created using the API endpoints above.

---

## 🗺️ Navigation Map

### Sidebar Navigation
- **Home/Profile** → Your profile page (Badges, Performance, Location settings)
- **Sectors** → Browse and join sectors (NEW!)
- **Groups** → Existing groups feature
- **Leaderboard** → Global leaderboard (can be enhanced with location filters)
- **Courses** → Your courses

### Profile Page Sections (in order)
1. **Contribution Activity** - GitHub heatmap
2. **Profile Settings** - Edit profile, location, API keys
3. **Badges & Achievements** - View earned and available badges
4. **Performance Analytics** - Performance metrics and analysis (NEW!)
5. **Group Rankings** - Your rankings in groups

---

## 🚀 Quick Start Guide

### To See Badges:
1. Complete a project
2. Go to `/{yourUsername}/profile`
3. Check "Badges & Achievements" section
4. Badges are automatically awarded!

### To Join a Sector:
1. Click "Sectors" in sidebar
2. Browse available sectors
3. Click "Join Sector" button
4. View your rank on the sector leaderboard

### To Set Location:
1. Go to `/{yourUsername}/profile`
2. Scroll to "Profile Settings"
3. Fill in Country, City, Region, Timezone
4. Click "Update Profile"

### To View Performance:
1. Go to `/{yourUsername}/profile`
2. Scroll to "Performance Analytics"
3. View your scores, strengths, and weaknesses

---

## 📝 Notes

- **Badges** are automatically checked and awarded when you:
  - Complete a project
  - Update your score
  - Maintain streaks

- **Sectors** allow you to:
  - Compete with others in your field
  - Track sector-specific scores
  - View sector leaderboards

- **Performance Tracking** provides:
  - Real-time performance metrics
  - Comparison capabilities (via API)
  - Personalized recommendations

- **Location** enables:
  - Country/city-based leaderboards
  - Regional competition
  - Location-based badges (future feature)

---

**Last Updated:** 2025-11-10


