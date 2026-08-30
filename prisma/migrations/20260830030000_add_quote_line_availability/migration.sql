-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuoteLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "tenderItemId" TEXT NOT NULL,
    "priceGbp" INTEGER,
    "available" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuoteLine_tenderItemId_fkey" FOREIGN KEY ("tenderItemId") REFERENCES "TenderItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_QuoteLine" ("available", "id", "priceGbp", "quoteId", "tenderItemId") SELECT true, "id", "priceGbp", "quoteId", "tenderItemId" FROM "QuoteLine";
DROP TABLE "QuoteLine";
ALTER TABLE "new_QuoteLine" RENAME TO "QuoteLine";
CREATE UNIQUE INDEX "QuoteLine_quoteId_tenderItemId_key" ON "QuoteLine"("quoteId", "tenderItemId");
CREATE INDEX "QuoteLine_tenderItemId_idx" ON "QuoteLine"("tenderItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;