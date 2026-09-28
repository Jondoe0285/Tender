-- Existing rows were created before Owner template choice existed.
UPDATE "MarketingCampaign" SET "templateKey" = 'MARKETPLACE' WHERE "templateKey" IN ('HSQE_CONSULTHUB', '');
ALTER TABLE "MarketingCampaign" ALTER COLUMN "templateKey" SET DEFAULT 'MARKETPLACE';
