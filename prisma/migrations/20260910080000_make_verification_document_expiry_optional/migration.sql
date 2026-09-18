-- Certificate of Incorporation does not expire, so its expiry date is optional.
ALTER TABLE "VerificationDocument" ALTER COLUMN "expiryDate" DROP NOT NULL;
UPDATE "VerificationDocument" SET "expiryDate" = NULL WHERE "documentType" = 'CERTIFICATE_OF_INCORPORATION';
