CREATE TABLE "TenderPackage" (
  "id" TEXT NOT NULL,
  "tenderId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subcategory" TEXT NOT NULL,
  "service" TEXT NOT NULL DEFAULT 'Materials',
  "item" TEXT,
  "location" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "urgency" TEXT NOT NULL,
  "closingDate" TIMESTAMP(3) NOT NULL,
  "supplyDate" TIMESTAMP(3),
  "requirements" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "TenderStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TenderPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenderPackage_reference_key"
  ON "TenderPackage"("reference");

CREATE INDEX "TenderPackage_tenderId_status_createdAt_idx"
  ON "TenderPackage"("tenderId", "status", "createdAt");

ALTER TABLE "TenderPackage"
  ADD CONSTRAINT "TenderPackage_tenderId_fkey"
  FOREIGN KEY ("tenderId") REFERENCES "Tender"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TenderPackage" (
  "id",
  "tenderId",
  "reference",
  "category",
  "subcategory",
  "service",
  "item",
  "location",
  "quantity",
  "urgency",
  "closingDate",
  "supplyDate",
  "requirements",
  "description",
  "status",
  "createdAt"
)
SELECT
  gen_random_uuid()::text,
  t."id",
  t."reference" || '-PK1',
  t."category",
  t."subcategory",
  t."service",
  t."item",
  t."location",
  t."quantity",
  t."urgency",
  t."closingDate",
  t."supplyDate",
  t."requirements",
  t."description",
  t."status",
  t."createdAt"
FROM "Tender" AS t;
