CREATE TYPE "LegalHoldScope" AS ENUM ('TENDER', 'QUOTE', 'TENDER_ATTACHMENT');

CREATE TABLE "LegalHold" (
  "id" TEXT NOT NULL,
  "scope" "LegalHoldScope" NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedById" TEXT,
  "releasedAt" TIMESTAMP(3),
  "releaseReason" TEXT,
  "tenderId" TEXT,
  "quoteId" TEXT,
  "attachmentId" TEXT,

  CONSTRAINT "LegalHold_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalHold_scope_target_check" CHECK (
    ("scope" = 'TENDER' AND "quoteId" IS NULL AND "attachmentId" IS NULL AND ("tenderId" IS NOT NULL OR "releasedAt" IS NOT NULL))
    OR ("scope" = 'QUOTE' AND "tenderId" IS NULL AND "attachmentId" IS NULL AND ("quoteId" IS NOT NULL OR "releasedAt" IS NOT NULL))
    OR ("scope" = 'TENDER_ATTACHMENT' AND "tenderId" IS NULL AND "quoteId" IS NULL AND ("attachmentId" IS NOT NULL OR "releasedAt" IS NOT NULL))
  ),
  CONSTRAINT "LegalHold_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LegalHold_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LegalHold_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LegalHold_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LegalHold_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "TenderAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "LegalHold_tenderId_releasedAt_idx" ON "LegalHold"("tenderId", "releasedAt");
CREATE INDEX "LegalHold_quoteId_releasedAt_idx" ON "LegalHold"("quoteId", "releasedAt");
CREATE INDEX "LegalHold_attachmentId_releasedAt_idx" ON "LegalHold"("attachmentId", "releasedAt");
CREATE UNIQUE INDEX "LegalHold_active_scope_target_key" ON "LegalHold"("scope", "targetId") WHERE "releasedAt" IS NULL;