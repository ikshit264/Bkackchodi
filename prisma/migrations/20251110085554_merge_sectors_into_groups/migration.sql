-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('CUSTOM', 'CATEGORY');

-- AlterTable: Add new columns to Group
ALTER TABLE "Group" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "type" "GroupType" NOT NULL DEFAULT 'CUSTOM';

-- CreateIndex
CREATE INDEX "Group_type_idx" ON "Group"("type");
CREATE INDEX "Group_type_isPrivate_idx" ON "Group"("type", "isPrivate");

-- DATA MIGRATION: Migrate Sector data to Groups
-- Step 1: Insert sectors as category groups (only if Sector table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Sector') THEN
        -- Insert sectors as category groups
        INSERT INTO "Group" (id, name, description, "type", icon, "isPrivate", "createdAt", "updatedAt")
        SELECT 
            id,
            name,
            description,
            'CATEGORY'::"GroupType",
            icon,
            false, -- Category groups are public
            "createdAt",
            NOW()
        FROM "Sector"
        ON CONFLICT (name) DO NOTHING;

        -- Step 2: Migrate UserSector to GroupMembership (if UserSector table exists)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'UserSector') THEN
            INSERT INTO "GroupMembership" (id, "userId", "groupId", "joinedAt", role)
            SELECT 
                gen_random_uuid()::text,
                "userId",
                "sectorId",
                "joinedAt",
                'MEMBER'::"GroupRole"
            FROM "UserSector"
            WHERE NOT EXISTS (
                SELECT 1 FROM "GroupMembership" gm 
                WHERE gm."userId" = "UserSector"."userId" 
                AND gm."groupId" = "UserSector"."sectorId"
            );
        END IF;

        -- Step 3: Migrate SectorScore to GroupScore (if SectorScore table exists)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SectorScore') THEN
            INSERT INTO "GroupScore" (id, "userId", "groupId", "finalScore", rank, "lastUpdatedDate", "updatedAt", "coursesStarted", "averageCourseCompletion", "projectsStarted", "projectsCompleted", "totalAiEvaluationScore")
            SELECT 
                gen_random_uuid()::text,
                "userId",
                "sectorId",
                score,
                rank,
                "lastUpdatedDate",
                NOW(),
                0, -- Will be recalculated by the system
                0,
                0,
                0,
                0
            FROM "SectorScore"
            WHERE NOT EXISTS (
                SELECT 1 FROM "GroupScore" gs 
                WHERE gs."userId" = "SectorScore"."userId" 
                AND gs."groupId" = "SectorScore"."sectorId"
            );
        END IF;

        -- Step 4: Update courses that had sectorId to use the groupId
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Course' AND column_name = 'sectorId') THEN
            UPDATE "Course"
            SET "groupId" = "sectorId"
            WHERE "sectorId" IS NOT NULL AND ("groupId" IS NULL OR "groupId" != "sectorId");
        END IF;
    END IF;
END $$;

-- DropForeignKey (if they exist)
ALTER TABLE "public"."Course" DROP CONSTRAINT IF EXISTS "Course_sectorId_fkey";
ALTER TABLE "public"."SectorScore" DROP CONSTRAINT IF EXISTS "SectorScore_sectorId_fkey";
ALTER TABLE "public"."SectorScore" DROP CONSTRAINT IF EXISTS "SectorScore_userId_fkey";
ALTER TABLE "public"."UserSector" DROP CONSTRAINT IF EXISTS "UserSector_sectorId_fkey";
ALTER TABLE "public"."UserSector" DROP CONSTRAINT IF EXISTS "UserSector_userId_fkey";

-- DropColumn
ALTER TABLE "Course" DROP COLUMN IF EXISTS "sectorId";

-- DropTable (only if they exist)
DROP TABLE IF EXISTS "SectorScore";
DROP TABLE IF EXISTS "UserSector";
DROP TABLE IF EXISTS "Sector";
