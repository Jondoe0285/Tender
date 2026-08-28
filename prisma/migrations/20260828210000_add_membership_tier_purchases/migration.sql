-- Add membership purchase payment type and payment-to-tier binding.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amountGbp" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "tenderId" TEXT,
    "tierId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutUrl" TEXT,
    "stripeEventId" TEXT,
    "stripeReceiptUrl" TEXT,
    "accountingRecordPath" TEXT,
    "quoteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "MembershipTier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("accountingRecordPath", "amountGbp", "confirmedAt", "createdAt", "id", "quoteId", "status", "stripeCheckoutUrl", "stripeEventId", "stripePaymentIntentId", "stripeReceiptUrl", "tenderId", "type", "userId") SELECT "accountingRecordPath", "amountGbp", "confirmedAt", "createdAt", "id", "quoteId", "status", "stripeCheckoutUrl", "stripeEventId", "stripePaymentIntentId", "stripeReceiptUrl", "tenderId", "type", "userId" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Payment_stripeEventId_key" ON "Payment"("stripeEventId");
CREATE UNIQUE INDEX "Payment_quoteId_key" ON "Payment"("quoteId");

CREATE TABLE "new_RetailerMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "paymentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetailerMembership_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RetailerMembership_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "MembershipTier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RetailerMembership_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RetailerMembership" ("active", "assignedAt", "id", "retailerId", "tierId") SELECT "active", "assignedAt", "id", "retailerId", "tierId" FROM "RetailerMembership";
DROP TABLE "RetailerMembership";
ALTER TABLE "new_RetailerMembership" RENAME TO "RetailerMembership";
CREATE UNIQUE INDEX "RetailerMembership_paymentId_key" ON "RetailerMembership"("paymentId");
CREATE UNIQUE INDEX "RetailerMembership_retailerId_tierId_key" ON "RetailerMembership"("retailerId", "tierId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
