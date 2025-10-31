-- DropIndex
DROP INDEX "public"."Score_rank_key";

-- CreateIndex
CREATE INDEX "Score_finalScore_contribution_lastUpdatedDate_idx" ON "Score"("finalScore", "contribution", "lastUpdatedDate");
