/*
  Warnings:

  - The values [OWNER,MANAGER,EDITOR] on the enum `CourseAccessLevel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CourseAccessLevel_new" AS ENUM ('VIEWER', 'CLONE');
ALTER TABLE "CourseAccess" ALTER COLUMN "access" TYPE "CourseAccessLevel_new" USING ("access"::text::"CourseAccessLevel_new");
ALTER TABLE "CourseInvite" ALTER COLUMN "access" TYPE "CourseAccessLevel_new" USING ("access"::text::"CourseAccessLevel_new");
ALTER TYPE "CourseAccessLevel" RENAME TO "CourseAccessLevel_old";
ALTER TYPE "CourseAccessLevel_new" RENAME TO "CourseAccessLevel";
DROP TYPE "public"."CourseAccessLevel_old";
COMMIT;

-- AlterTable
ALTER TABLE "GroupInvite" ADD COLUMN     "role" "GroupRole" NOT NULL DEFAULT 'MEMBER';
