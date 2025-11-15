/*
  Warnings:

  - You are about to drop the column `commits` on the `GroupScore` table. All the data in the column will be lost.
  - You are about to drop the column `contribution` on the `GroupScore` table. All the data in the column will be lost.
  - You are about to drop the column `currentStreak` on the `GroupScore` table. All the data in the column will be lost.
  - You are about to drop the column `issue` on the `GroupScore` table. All the data in the column will be lost.
  - You are about to drop the column `longestStreak` on the `GroupScore` table. All the data in the column will be lost.
  - You are about to drop the column `pullRequests` on the `GroupScore` table. All the data in the column will be lost.
  - You are about to drop the column `review` on the `GroupScore` table. All the data in the column will be lost.
  - You are about to drop the column `totalActiveDays` on the `GroupScore` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupScore" DROP COLUMN "commits",
DROP COLUMN "contribution",
DROP COLUMN "currentStreak",
DROP COLUMN "issue",
DROP COLUMN "longestStreak",
DROP COLUMN "pullRequests",
DROP COLUMN "review",
DROP COLUMN "totalActiveDays",
ADD COLUMN     "averageCourseCompletion" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "coursesStarted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "projectsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "projectsStarted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalAiEvaluationScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "aiEvaluationScore" DOUBLE PRECISION,
ADD COLUMN     "evaluatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "githubScore" INTEGER NOT NULL DEFAULT 0;
