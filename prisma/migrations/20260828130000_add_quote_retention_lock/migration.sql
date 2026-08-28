ALTER TABLE "Quote" ADD COLUMN "retentionLockedUntil" DATETIME;

UPDATE "Quote"
SET "retentionLockedUntil" = datetime('now', '+5 years')
WHERE "status" = 'ACCEPTED';
