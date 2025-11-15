-- AlterTable: Add new fields to Challenge
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- AlterTable: Add new fields to ChallengeParticipant
ALTER TABLE "ChallengeParticipant" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ChallengeParticipant" ADD COLUMN IF NOT EXISTS "rank" INTEGER;
ALTER TABLE "ChallengeParticipant" ADD COLUMN IF NOT EXISTS "challengeCourseId" TEXT;
ALTER TABLE "ChallengeParticipant" ADD COLUMN IF NOT EXISTS "challengeProjectId" TEXT;

-- CreateTable: ChallengeInvite
CREATE TABLE IF NOT EXISTS "ChallengeInvite" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Challenge_status_isPublic_idx" ON "Challenge"("status", "isPublic");
CREATE INDEX IF NOT EXISTS "Challenge_createdBy_idx" ON "Challenge"("createdBy");
CREATE INDEX IF NOT EXISTS "Challenge_courseId_idx" ON "Challenge"("courseId");
CREATE INDEX IF NOT EXISTS "Challenge_projectId_idx" ON "Challenge"("projectId");
CREATE INDEX IF NOT EXISTS "Challenge_isDeleted_idx" ON "Challenge"("isDeleted");
CREATE INDEX IF NOT EXISTS "ChallengeParticipant_challengeId_points_idx" ON "ChallengeParticipant"("challengeId", "points");
CREATE INDEX IF NOT EXISTS "ChallengeParticipant_challengeId_rank_idx" ON "ChallengeParticipant"("challengeId", "rank");
CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeInvite_challengeId_toUserId_key" ON "ChallengeInvite"("challengeId", "toUserId");
CREATE INDEX IF NOT EXISTS "ChallengeInvite_toUserId_status_idx" ON "ChallengeInvite"("toUserId", "status");
CREATE INDEX IF NOT EXISTS "ChallengeInvite_challengeId_status_idx" ON "ChallengeInvite"("challengeId", "status");
CREATE INDEX IF NOT EXISTS "ChallengeInvite_expiresAt_idx" ON "ChallengeInvite"("expiresAt");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeCourseId_fkey" FOREIGN KEY ("challengeCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChallengeInvite" ADD CONSTRAINT "ChallengeInvite_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeInvite" ADD CONSTRAINT "ChallengeInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeInvite" ADD CONSTRAINT "ChallengeInvite_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

