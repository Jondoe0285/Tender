-- Purchase controls, four-eyes change log, and award PO number.

ALTER TABLE "ClientCompany" ADD COLUMN IF NOT EXISTS "releaseSpendCapGbp" DOUBLE PRECISION;
ALTER TABLE "Award" ADD COLUMN IF NOT EXISTS "purchaseOrderNumber" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "ControlChange" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "settingKey" TEXT,
  "proposedValue" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL DEFAULT '{}',
  "proposedById" TEXT NOT NULL,
  "confirmedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  CONSTRAINT "ControlChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ControlChange_status_createdAt_idx" ON "ControlChange"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ControlChange_kind_status_idx" ON "ControlChange"("kind", "status");

DO $$ BEGIN
  ALTER TABLE "ControlChange" ADD CONSTRAINT "ControlChange_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ControlChange" ADD CONSTRAINT "ControlChange_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
