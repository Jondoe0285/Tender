-- Full tender package: Project, Award, frozen package revision, classed attachments, numeric quantities, opportunity indexes.

DO $$ BEGIN
  CREATE TYPE "AttachmentKind" AS ENUM ('DRAWING', 'SPECIFICATION', 'RAMS', 'METHOD_STATEMENT', 'INSURANCE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Project_companyId_name_key" ON "Project"("companyId", "name");
CREATE INDEX IF NOT EXISTS "Project_companyId_createdAt_idx" ON "Project"("companyId", "createdAt");

ALTER TABLE "Tender" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

ALTER TABLE "TenderPackage" ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TenderPackage" ADD COLUMN IF NOT EXISTS "specHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TenderPackage" ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3);
ALTER TABLE "TenderPackage" ADD COLUMN IF NOT EXISTS "packageIndex" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TenderAttachment" ADD COLUMN IF NOT EXISTS "kind" "AttachmentKind" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "TenderAttachment" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TenderAttachment" ADD COLUMN IF NOT EXISTS "packageIndex" INTEGER;
ALTER TABLE "TenderAttachment" ADD COLUMN IF NOT EXISTS "objectKey" TEXT;

ALTER TABLE "TenderItem" ADD COLUMN IF NOT EXISTS "quantityValue" DOUBLE PRECISION;
ALTER TABLE "TenderItem" ADD COLUMN IF NOT EXISTS "unit" TEXT;
ALTER TABLE "TenderItem" ADD COLUMN IF NOT EXISTS "packageIndex" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "packageSpecHash" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "Award" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "tenderId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "packageSpecHash" TEXT NOT NULL,
  "awardedById" TEXT NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Award_quoteId_key" ON "Award"("quoteId");
CREATE INDEX IF NOT EXISTS "Award_tenderId_awardedAt_idx" ON "Award"("tenderId", "awardedAt");
CREATE INDEX IF NOT EXISTS "Award_projectId_idx" ON "Award"("projectId");

CREATE INDEX IF NOT EXISTS "Tender_status_closingDate_idx" ON "Tender"("status", "closingDate");
CREATE INDEX IF NOT EXISTS "Tender_category_subcategory_status_idx" ON "Tender"("category", "subcategory", "status");
CREATE INDEX IF NOT EXISTS "Tender_projectId_idx" ON "Tender"("projectId");
CREATE INDEX IF NOT EXISTS "Tender_clientId_status_closingDate_idx" ON "Tender"("clientId", "status", "closingDate");
CREATE INDEX IF NOT EXISTS "TenderPackage_tenderId_packageIndex_idx" ON "TenderPackage"("tenderId", "packageIndex");
CREATE INDEX IF NOT EXISTS "TenderAttachment_tenderId_kind_idx" ON "TenderAttachment"("tenderId", "kind");

DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Tender" ADD CONSTRAINT "Tender_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Award" ADD CONSTRAINT "Award_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Award" ADD CONSTRAINT "Award_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Award" ADD CONSTRAINT "Award_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Award" ADD CONSTRAINT "Award_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
