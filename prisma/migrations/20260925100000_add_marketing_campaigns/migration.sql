CREATE TABLE "MarketingCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL DEFAULT 'HSQE_CONSULTHUB',
  "fileName" TEXT NOT NULL,
  "ctaUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "lawfulBasisConfirmedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingCampaignRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingCampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingUnsubscribe" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "unsubscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  CONSTRAINT "MarketingUnsubscribe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingCampaignRecipient_campaignId_email_key" ON "MarketingCampaignRecipient"("campaignId", "email");
CREATE INDEX "MarketingCampaignRecipient_campaignId_status_idx" ON "MarketingCampaignRecipient"("campaignId", "status");
CREATE INDEX "MarketingCampaign_createdById_createdAt_idx" ON "MarketingCampaign"("createdById", "createdAt");
CREATE INDEX "MarketingCampaign_status_createdAt_idx" ON "MarketingCampaign"("status", "createdAt");
CREATE UNIQUE INDEX "MarketingUnsubscribe_email_key" ON "MarketingUnsubscribe"("email");

ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaignRecipient" ADD CONSTRAINT "MarketingCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
