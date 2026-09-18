-- CreateEnum
CREATE TYPE "EnhancedVerificationInvitationStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "EnhancedVerificationInvitation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "moduleCode" TEXT NOT NULL DEFAULT 'VERIFICATION',
    "productCode" TEXT NOT NULL DEFAULT 'ENHANCED_VERIFICATION',
    "tokenHash" TEXT NOT NULL,
    "status" "EnhancedVerificationInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnhancedVerificationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnhancedVerificationInvitation_tokenHash_key" ON "EnhancedVerificationInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "EnhancedVerificationInvitation_userId_expiresAt_idx" ON "EnhancedVerificationInvitation"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "EnhancedVerificationInvitation_paymentId_idx" ON "EnhancedVerificationInvitation"("paymentId");

-- CreateIndex
CREATE INDEX "EnhancedVerificationInvitation_recipientEmail_idx" ON "EnhancedVerificationInvitation"("recipientEmail");

-- AddForeignKey
ALTER TABLE "EnhancedVerificationInvitation" ADD CONSTRAINT "EnhancedVerificationInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnhancedVerificationInvitation" ADD CONSTRAINT "EnhancedVerificationInvitation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
