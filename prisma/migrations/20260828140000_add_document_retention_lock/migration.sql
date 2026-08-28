ALTER TABLE "TenderAttachment" ADD COLUMN "retentionLockedUntil" DATETIME;

UPDATE "TenderAttachment"
SET "retentionLockedUntil" = datetime('now', '+5 years')
WHERE EXISTS (
  SELECT 1
  FROM "Quote"
  WHERE "Quote"."tenderId" = "TenderAttachment"."tenderId"
    AND "Quote"."status" = 'ACCEPTED'
);
