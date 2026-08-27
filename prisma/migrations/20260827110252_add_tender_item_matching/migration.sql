-- AlterTable
ALTER TABLE "TenderItem" ADD COLUMN "item" TEXT;

-- CreateTable
CREATE TABLE "TenderItemMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderItemId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "notifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenderItemMatch_tenderItemId_fkey" FOREIGN KEY ("tenderItemId") REFERENCES "TenderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TenderItemMatch_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tender" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT 'Materials',
    "item" TEXT,
    "location" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "closingDate" DATETIME NOT NULL,
    "budget" INTEGER,
    "requirements" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tender_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tender" ("budget", "category", "clientId", "closingDate", "createdAt", "description", "id", "location", "quantity", "reference", "requirements", "status", "subcategory", "urgency") SELECT "budget", "category", "clientId", "closingDate", "createdAt", "description", "id", "location", "quantity", "reference", "requirements", "status", "subcategory", "urgency" FROM "Tender";
DROP TABLE "Tender";
ALTER TABLE "new_Tender" RENAME TO "Tender";
CREATE UNIQUE INDEX "Tender_reference_key" ON "Tender"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TenderItemMatch_tenderItemId_retailerId_key" ON "TenderItemMatch"("tenderItemId", "retailerId");
