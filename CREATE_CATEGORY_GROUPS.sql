-- SQL Script to Create Default Category Groups (Sectors)
-- Run this in your Neon PostgreSQL database

-- First, ensure the GroupType enum exists (should already exist from migration)
-- If not, uncomment the line below:
-- CREATE TYPE "GroupType" AS ENUM ('CUSTOM', 'CATEGORY');

-- Insert default category groups
-- Using INSERT ... ON CONFLICT to avoid duplicates if run multiple times

INSERT INTO "Group" (id, name, description, "type", icon, "isPrivate", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid(),
    'Web Development',
    'Frontend and backend web development technologies',
    'CATEGORY'::"GroupType",
    '🌐',
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'AI/ML',
    'Artificial Intelligence and Machine Learning',
    'CATEGORY'::"GroupType",
    '🤖',
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Mobile Development',
    'iOS and Android mobile app development',
    'CATEGORY'::"GroupType",
    '📱',
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'DevOps',
    'DevOps, CI/CD, and infrastructure',
    'CATEGORY'::"GroupType",
    '⚙️',
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Data Science',
    'Data analysis, visualization, and science',
    'CATEGORY'::"GroupType",
    '📊',
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Cybersecurity',
    'Security, ethical hacking, and penetration testing',
    'CATEGORY'::"GroupType",
    '🔒',
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Game Development',
    'Game design and development',
    'CATEGORY'::"GroupType",
    '🎮',
    false,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Blockchain',
    'Blockchain and cryptocurrency development',
    'CATEGORY'::"GroupType",
    '⛓️',
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (name) 
DO UPDATE SET
  "type" = 'CATEGORY'::"GroupType",
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  "isPrivate" = false,
  "updatedAt" = NOW();

-- Verify the groups were created
SELECT id, name, "type", icon, description, "isPrivate" 
FROM "Group" 
WHERE "type" = 'CATEGORY'::"GroupType"
ORDER BY name;


