# How to Use Groups and Sectors (Category Groups)

## Quick Start Guide

### For Regular Users

#### 1. **Browse Category Groups (Sectors)**
- Navigate to `/sectors` in your browser
- You'll see all available technology categories
- Each category shows:
  - Icon (emoji)
  - Name (e.g., "Web Development")
  - Description
  - Number of members
  - Number of courses

#### 2. **Join a Category Group**
- Click on any category card
- Click the "Join Sector" button
- You're now part of that category!
- Your progress in that category will be tracked

#### 3. **View Category Leaderboard**
- After joining, click on the category again
- Navigate to the "Leaderboard" tab
- See your rank and score
- Compare with others in your field

#### 4. **Create a Custom Group**
- Go to `/groups` page
- Click "Create Group"
- Enter group name and description
- Choose if it's private or public
- Invite members

#### 5. **Use Groups for Courses**
- When creating a course, you can assign it to a group
- Category groups: For organizing by technology
- Custom groups: For team/class projects

---

### For Admins

#### 1. **Initialize Category Groups**
**Option A: Via UI (Recommended)**
- Go to `/admin` page
- Click "Groups" tab
- Click "Init Category Groups" button
- Done! All 8 default categories are created

**Option B: Via SQL (Direct Database)**
- Connect to your Neon PostgreSQL database
- Run the SQL script in `CREATE_CATEGORY_GROUPS.sql`
- This creates all default category groups

**Option C: Via API**
```bash
POST /api/admin/groups/init-categories
```

#### 2. **Create New Category Groups**
- Go to `/admin` → Groups tab
- Click "Create Category" button
- Fill in:
  - Name (e.g., "Cloud Computing")
  - Description
  - Icon (emoji or URL)
- Click "Create Category Group"

#### 3. **Edit Category Groups**
- Go to `/admin/groups/[groupId]`
- Click "Edit" button
- Update name, description, or icon
- Save changes

#### 4. **Delete Category Groups**
- Go to `/admin/groups/[groupId]`
- Click "Delete" button
- Confirm deletion

---

## Common Use Cases

### Scenario 1: Student Learning Web Development
1. **Join "Web Development" category**
   - Go to `/sectors`
   - Find "Web Development"
   - Click "Join Sector"

2. **Create courses in that category**
   - Create a course
   - Assign it to "Web Development" group
   - Your progress counts toward that category

3. **Track progress**
   - View leaderboard at `/groups/[web-dev-group-id]`
   - See your rank among web developers
   - Get motivated by top performers

### Scenario 2: College Class Study Group
1. **Create custom group**
   - Go to `/groups`
   - Click "Create Group"
   - Name: "CS101 Fall 2024"
   - Make it private
   - Invite classmates

2. **Share courses**
   - Create course assignments
   - Assign to your class group
   - Students compete within the group

3. **Track class progress**
   - View group leaderboard
   - See who's doing well
   - Encourage participation

### Scenario 3: Professional Learning AI
1. **Join "AI/ML" category**
   - Compete globally in AI/ML
   - See top AI developers
   - Track your AI learning progress

2. **Create company group**
   - Create "Company AI Team" group
   - Invite colleagues
   - Share internal AI projects
   - Compete within your team

---

## Navigation Guide

### Pages for Users
- `/sectors` - Browse and join category groups
- `/groups` - View and manage your groups
- `/groups/[groupId]` - View group details, leaderboard, analytics

### Pages for Admins
- `/admin` - Admin dashboard
- `/admin/groups` - Manage all groups
- `/admin/groups/[groupId]` - Edit/delete groups

---

## Tips

1. **Join multiple categories** if you're learning multiple technologies
2. **Create custom groups** for any collaborative learning
3. **Use categories** to discover courses in your field
4. **Use custom groups** for private team projects
5. **Check leaderboards regularly** to stay motivated

---

## Troubleshooting

**Q: I don't see any sectors/categories**
- Admins need to initialize category groups first
- Go to `/admin` → Groups → "Init Category Groups"

**Q: Can't join a category**
- Make sure you're logged in
- Check if the category exists
- Try refreshing the page

**Q: Can't create a category group**
- Only admins can create category groups
- Regular users can only create custom groups

**Q: My score isn't showing**
- Make sure you've joined the category
- Complete some courses/projects in that category
- Scores update after course completion


