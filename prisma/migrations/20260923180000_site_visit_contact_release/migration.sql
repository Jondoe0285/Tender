-- Unlock-time contact release for Contractor and Professional Services (no quote yet).
ALTER TABLE "ContactRelease" ALTER COLUMN "quoteId" DROP NOT NULL;
ALTER TABLE "ContactRelease" ALTER COLUMN "authorizingPaymentId" DROP NOT NULL;
CREATE UNIQUE INDEX "ContactRelease_tenderId_retailerId_key" ON "ContactRelease"("tenderId", "retailerId");
CREATE INDEX "ContactRelease_tenderId_clientId_idx" ON "ContactRelease"("tenderId", "clientId");

ALTER TABLE "ContactReleaseAuditEvent" ALTER COLUMN "quoteId" DROP NOT NULL;
ALTER TABLE "ContactReleaseAuditEvent" ALTER COLUMN "authorizingPaymentId" DROP NOT NULL;
