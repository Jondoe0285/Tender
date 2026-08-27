/*
  Warnings:

  - Added the required column `accreditations` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deliveryInfo` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadTimeDays` to the `Quote` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("id", "notes", "priceGbp", "reference", "retailerId", "status", "submittedAt", "tenderId", "validityDays", "leadTimeDays", "deliveryInfo", "accreditations") SELECT "id", "notes", "priceGbp", "reference", "retailerId", "status", "submittedAt", "tenderId", "validityDays", 0, 'Not specified', 'Not specified' FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE UNIQUE INDEX "Quote_reference_key" ON "Quote"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
