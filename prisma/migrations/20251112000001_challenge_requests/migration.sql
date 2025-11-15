-- CreateEnum
CREATE TYPE "ChallengeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ChallengeRequest" (
    "id" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" "ChallengeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "challengeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ChallengeType" NOT NULL,
    "courseId" TEXT,
    "projectId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "criteria" JSONB NOT NULL,
    "rewards" JSONB,
    "maxParticipants" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "ChallengeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeRequest_challengeId_key" ON "ChallengeRequest"("challengeId");
CREATE INDEX "ChallengeRequest_groupId_status_idx" ON "ChallengeRequest"("groupId", "status");
CREATE INDEX "ChallengeRequest_requestedBy_status_idx" ON "ChallengeRequest"("requestedBy", "status");
CREATE INDEX "ChallengeRequest_status_idx" ON "ChallengeRequest"("status");

-- AddForeignKey
ALTER TABLE "ChallengeRequest" ADD CONSTRAINT "ChallengeRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeRequest" ADD CONSTRAINT "ChallengeRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChallengeRequest" ADD CONSTRAINT "ChallengeRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeRequest" ADD CONSTRAINT "ChallengeRequest_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

