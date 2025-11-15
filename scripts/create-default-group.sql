-- ============================================
-- Create Default "Global" Group
-- ============================================
-- This script creates a default group named "Global" 
-- that all users can join for global rankings.
--
-- To run this script:
-- 1. Connect to your PostgreSQL database
-- 2. Run: psql -d your_database_name -f scripts/create-default-group.sql
--    OR paste this SQL in your database client
-- ============================================

-- Ensure UUID extension is enabled (if using gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert the Global group
INSERT INTO "Group" (
  id,
  name,
  description,
  "creatorId",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(), -- Generates a UUID (PostgreSQL 13+)
  'Global',
  'Default group for all users. Join this group to participate in global rankings and competitions.',
  NULL, -- No specific creator for default group
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (name) DO NOTHING; -- Prevents duplicate if script is run multiple times

-- Verify the group was created
SELECT 
  id,
  name,
  description,
  "createdAt"
FROM "Group"
WHERE name = 'Global';
