CREATE TABLE "ContactReleaseAuditEvent" (
  "id" TEXT NOT NULL,
  "contactReleaseId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "tenderId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "releasedDataCategory" TEXT NOT NULL,
  "releasedAt" TIMESTAMP(3) NOT NULL,
  "authorizingPaymentId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContactReleaseAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContactReleaseAuditEvent_contactReleaseId_key" ON "ContactReleaseAuditEvent"("contactReleaseId");
CREATE UNIQUE INDEX "ContactReleaseAuditEvent_quoteId_key" ON "ContactReleaseAuditEvent"("quoteId");
CREATE UNIQUE INDEX "ContactReleaseAuditEvent_correlationId_key" ON "ContactReleaseAuditEvent"("correlationId");
CREATE INDEX "ContactReleaseAuditEvent_authorizingPaymentId_idx" ON "ContactReleaseAuditEvent"("authorizingPaymentId");
CREATE INDEX "ContactReleaseAuditEvent_clientId_retailerId_idx" ON "ContactReleaseAuditEvent"("clientId", "retailerId");

INSERT INTO "ContactReleaseAuditEvent" (
  "id",
  "contactReleaseId",
  "actorId",
  "tenderId",
  "quoteId",
  "clientId",
  "retailerId",
  "releasedDataCategory",
  "releasedAt",
  "authorizingPaymentId",
  "correlationId",
  "createdAt"
)
SELECT
  'contact-release-audit-' || "id",
  "id",
  "clientId",
  "tenderId",
  "quoteId",
  "clientId",
  "retailerId",
  'CONTACT_DETAILS',
  "releasedAt",
  "authorizingPaymentId",
  'contact-release-' || "id",
  "releasedAt"
FROM "ContactRelease";

CREATE OR REPLACE FUNCTION prevent_contact_release_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ContactReleaseAuditEvent records are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_release_audit_event_immutable
BEFORE UPDATE OR DELETE ON "ContactReleaseAuditEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_contact_release_audit_event_mutation();
