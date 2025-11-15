-- AlterTable
ALTER TABLE "Badge" ADD COLUMN     "image" TEXT,
ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "BadgeTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "icon" TEXT,
    "category" "BadgeCategory" NOT NULL,
    "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "conditionType" TEXT NOT NULL,
    "conditionValue" JSONB NOT NULL,
    "criteria" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BadgeTemplate_name_key" ON "BadgeTemplate"("name");

-- CreateIndex
CREATE INDEX "BadgeTemplate_isActive_idx" ON "BadgeTemplate"("isActive");

-- CreateIndex
CREATE INDEX "BadgeTemplate_conditionType_idx" ON "BadgeTemplate"("conditionType");

-- CreateIndex
CREATE INDEX "Badge_templateId_idx" ON "Badge"("templateId");

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BadgeTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;


