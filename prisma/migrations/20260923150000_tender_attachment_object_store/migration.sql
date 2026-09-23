-- Stop persisting new tender attachment bytes in Postgres. Existing rows keep content until read.

ALTER TABLE "TenderAttachment" ALTER COLUMN "content" DROP NOT NULL;
