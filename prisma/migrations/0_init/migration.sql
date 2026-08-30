-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_USER', 'CLIENT', 'RETAILER');

-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "UnlockMethod" AS ENUM ('CREDIT', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('RETAILER_UNLOCK', 'CLIENT_RELEASE', 'SPONSORED_PLACEMENT', 'MEMBERSHIP_TIER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('ALLOW', 'WARN', 'BLOCK', 'REVIEW');

-- CreateEnum
CREATE TYPE "RetailerPermission" AS ENUM ('VIEW', 'EDIT', 'SUPER_USER', 'PAYMENTS');

-- CreateEnum
CREATE TYPE "RetailerCoverageScope" AS ENUM ('COUNTY', 'REGION', 'UK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "isAccountant" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "contactPhone" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "decision" "ModerationDecision" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "reasons" TEXT NOT NULL,
    "entities" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCompany" (
    "id" TEXT NOT NULL,
    "tradeTenderId" TEXT,
    "companyName" TEXT NOT NULL,
    "primaryUserId" TEXT NOT NULL,
    "releaseCreditsLeft" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryDefinition" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "monthlyPriceGbp" INTEGER NOT NULL,
    "freeTenderOpportunitiesPerMonth" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerMembership" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "paymentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "annualPriceGbp" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerSubscription" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerSponsoredPlacement" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "paymentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerSponsoredPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "masterUserId" TEXT,
    "companyName" TEXT NOT NULL,
    "companyNumber" TEXT,
    "address" TEXT,
    "coverageScope" "RetailerCoverageScope" NOT NULL DEFAULT 'COUNTY',
    "counties" TEXT NOT NULL DEFAULT '',
    "regions" TEXT NOT NULL DEFAULT '',
    "categories" TEXT NOT NULL,
    "coverageAreas" TEXT NOT NULL,
    "accreditations" TEXT,
    "launchCreditsLeft" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerTeamMember" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT 'Materials',
    "item" TEXT,
    "location" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "closingDate" TIMESTAMP(3) NOT NULL,
    "budget" INTEGER,
    "requirements" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TenderStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderMessage" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderAttachment" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionLockedUntil" TIMESTAMP(3),

    CONSTRAINT "TenderAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderItem" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "item" TEXT,
    "quantity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderItemMatch" (
    "id" TEXT NOT NULL,
    "tenderItemId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderItemMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderMatch" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "TenderMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unlock" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "method" "UnlockMethod" NOT NULL,
    "paymentId" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "priceGbp" INTEGER NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "deliveryInfo" TEXT NOT NULL,
    "accreditations" TEXT NOT NULL,
    "supportingDocumentName" TEXT,
    "validityDays" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionLockedUntil" TIMESTAMP(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amountGbp" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "tenderId" TEXT,
    "tierId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutUrl" TEXT,
    "stripeEventId" TEXT,
    "stripeReceiptUrl" TEXT,
    "accountingRecordPath" TEXT,
    "quoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRelease" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizingPaymentId" TEXT NOT NULL,

    CONSTRAINT "ContactRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ModerationEvent_decision_createdAt_idx" ON "ModerationEvent"("decision", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationEvent_actorId_createdAt_idx" ON "ModerationEvent"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompany_tradeTenderId_key" ON "ClientCompany"("tradeTenderId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompany_primaryUserId_key" ON "ClientCompany"("primaryUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompanyMember_userId_key" ON "ClientCompanyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompanyMember_companyId_userId_key" ON "ClientCompanyMember"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryDefinition_service_name_key" ON "CategoryDefinition"("service", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipTier_name_key" ON "MembershipTier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerMembership_paymentId_key" ON "RetailerMembership"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerMembership_retailerId_tierId_key" ON "RetailerMembership"("retailerId", "tierId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerSubscription_retailerId_planId_key" ON "RetailerSubscription"("retailerId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerSponsoredPlacement_paymentId_key" ON "RetailerSponsoredPlacement"("paymentId");

-- CreateIndex
CREATE INDEX "RetailerSponsoredPlacement_retailerId_active_idx" ON "RetailerSponsoredPlacement"("retailerId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerProfile_userId_key" ON "RetailerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerTeamMember_userId_key" ON "RetailerTeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerTeamMember_retailerId_userId_key" ON "RetailerTeamMember"("retailerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tender_reference_key" ON "Tender"("reference");

-- CreateIndex
CREATE INDEX "TenderMessage_tenderId_retailerId_createdAt_idx" ON "TenderMessage"("tenderId", "retailerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenderItemMatch_tenderItemId_retailerId_key" ON "TenderItemMatch"("tenderItemId", "retailerId");

-- CreateIndex
CREATE UNIQUE INDEX "TenderMatch_tenderId_retailerId_key" ON "TenderMatch"("tenderId", "retailerId");

-- CreateIndex
CREATE UNIQUE INDEX "Unlock_paymentId_key" ON "Unlock"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Unlock_tenderId_retailerId_key" ON "Unlock"("tenderId", "retailerId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_reference_key" ON "Quote"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeEventId_key" ON "Payment"("stripeEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_quoteId_key" ON "Payment"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactRelease_quoteId_key" ON "ContactRelease"("quoteId");

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompany" ADD CONSTRAINT "ClientCompany_primaryUserId_fkey" FOREIGN KEY ("primaryUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompanyMember" ADD CONSTRAINT "ClientCompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompanyMember" ADD CONSTRAINT "ClientCompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerMembership" ADD CONSTRAINT "RetailerMembership_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerMembership" ADD CONSTRAINT "RetailerMembership_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "MembershipTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerMembership" ADD CONSTRAINT "RetailerMembership_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerSubscription" ADD CONSTRAINT "RetailerSubscription_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerSubscription" ADD CONSTRAINT "RetailerSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerSponsoredPlacement" ADD CONSTRAINT "RetailerSponsoredPlacement_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerSponsoredPlacement" ADD CONSTRAINT "RetailerSponsoredPlacement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerProfile" ADD CONSTRAINT "RetailerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerProfile" ADD CONSTRAINT "RetailerProfile_masterUserId_fkey" FOREIGN KEY ("masterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerTeamMember" ADD CONSTRAINT "RetailerTeamMember_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "RetailerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerTeamMember" ADD CONSTRAINT "RetailerTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderMessage" ADD CONSTRAINT "TenderMessage_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderMessage" ADD CONSTRAINT "TenderMessage_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderMessage" ADD CONSTRAINT "TenderMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderMessage" ADD CONSTRAINT "TenderMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderAttachment" ADD CONSTRAINT "TenderAttachment_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderItem" ADD CONSTRAINT "TenderItem_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderItemMatch" ADD CONSTRAINT "TenderItemMatch_tenderItemId_fkey" FOREIGN KEY ("tenderItemId") REFERENCES "TenderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderItemMatch" ADD CONSTRAINT "TenderItemMatch_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderMatch" ADD CONSTRAINT "TenderMatch_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unlock" ADD CONSTRAINT "Unlock_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unlock" ADD CONSTRAINT "Unlock_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unlock" ADD CONSTRAINT "Unlock_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "MembershipTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRelease" ADD CONSTRAINT "ContactRelease_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRelease" ADD CONSTRAINT "ContactRelease_authorizingPaymentId_fkey" FOREIGN KEY ("authorizingPaymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

