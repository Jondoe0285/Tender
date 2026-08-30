-- CreateTable
CREATE TABLE "QuoteCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceGbp" INTEGER NOT NULL,
    CONSTRAINT "QuoteCharge_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "QuoteCharge_quoteId_idx" ON "QuoteCharge"("quoteId");

-- RedefineTables: free-text additionalCharges is replaced by priced QuoteCharge rows.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "priceGbp" INTEGER NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "deliveryDateConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "deliveryInfo" TEXT NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionLockedUntil" DATETIME,
    CONSTRAINT "Quote_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("deliveryDateConfirmed", "deliveryInfo", "id", "leadTimeDays", "priceGbp", "reference", "retailerId", "retentionLockedUntil", "status", "submittedAt", "tenderId", "validityDays") SELECT "deliveryDateConfirmed", "deliveryInfo", "id", "leadTimeDays", "priceGbp", "reference", "retailerId", "retentionLockedUntil", "status", "submittedAt", "tenderId", "validityDays" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE UNIQUE INDEX "Quote_reference_key" ON "Quote"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
