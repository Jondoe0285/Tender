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
    "requirements" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tender_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tender" ("category", "clientId", "closingDate", "createdAt", "description", "id", "item", "location", "quantity", "reference", "requirements", "service", "status", "subcategory", "urgency") SELECT "category", "clientId", "closingDate", "createdAt", "description", "id", "item", "location", "quantity", "reference", "requirements", "service", "status", "subcategory", "urgency" FROM "Tender";
DROP TABLE "Tender";
ALTER TABLE "new_Tender" RENAME TO "Tender";
CREATE UNIQUE INDEX "Tender_reference_key" ON "Tender"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;