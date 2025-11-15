-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('PROJECT_COMPLETED', 'PROJECT_STARTED', 'COURSE_COMPLETED', 'COURSE_STARTED', 'BADGE_EARNED', 'LOGIN', 'COMMENT', 'GROUP_JOINED', 'SECTOR_JOINED', 'PROJECT_EVALUATED', 'COURSE_CREATED');

-- CreateTable
CREATE TABLE "DailyContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "contributionType" "ContributionType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyContribution_userId_date_idx" ON "DailyContribution"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyContribution_date_idx" ON "DailyContribution"("date");

-- CreateIndex
CREATE INDEX "DailyContribution_userId_contributionType_idx" ON "DailyContribution"("userId", "contributionType");

-- CreateIndex
CREATE INDEX "DailyContribution_date_contributionType_idx" ON "DailyContribution"("date", "contributionType");

-- CreateIndex
CREATE UNIQUE INDEX "DailyContribution_userId_date_contributionType_key" ON "DailyContribution"("userId", "date", "contributionType");

-- AddForeignKey
ALTER TABLE "DailyContribution" ADD CONSTRAINT "DailyContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
