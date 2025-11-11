-- CreateEnum
CREATE TYPE "FeatureOrigin" AS ENUM ('USER', 'COMPETITOR', 'SYSTEM');

-- CreateTable
CREATE TABLE "FeatureDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "origin" "FeatureOrigin" NOT NULL DEFAULT 'COMPETITOR',
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFeature" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "featureDefinitionId" TEXT NOT NULL,
    "importance" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFeature_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Feature"
    ADD COLUMN "featureDefinitionId" TEXT,
    ADD COLUMN "competitorId" TEXT,
    ADD COLUMN "origin" "FeatureOrigin",
    ADD COLUMN "confidence" DOUBLE PRECISION,
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "FeatureDefinition_normalized_key" ON "FeatureDefinition"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFeature_projectId_featureDefinitionId_key" ON "ProjectFeature"("projectId", "featureDefinitionId");

-- CreateIndex
CREATE INDEX "Feature_featureDefinitionId_idx" ON "Feature"("featureDefinitionId");

-- CreateIndex
CREATE INDEX "Feature_competitorId_idx" ON "Feature"("competitorId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_runId_competitorId_normalized_key" ON "Feature"("runId", "competitorId", "normalized");

ALTER TABLE "Feature" ADD CONSTRAINT "Feature_featureDefinitionId_fkey" FOREIGN KEY ("featureDefinitionId") REFERENCES "FeatureDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFeature" ADD CONSTRAINT "ProjectFeature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFeature" ADD CONSTRAINT "ProjectFeature_featureDefinitionId_fkey" FOREIGN KEY ("featureDefinitionId") REFERENCES "FeatureDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

