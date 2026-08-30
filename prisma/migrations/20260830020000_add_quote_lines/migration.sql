-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "tenderItemId" TEXT NOT NULL,
    "priceGbp" INTEGER NOT NULL,
    CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuoteLine_tenderItemId_fkey" FOREIGN KEY ("tenderItemId") REFERENCES "TenderItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteLine_quoteId_tenderItemId_key" ON "QuoteLine"("quoteId", "tenderItemId");

-- CreateIndex
CREATE INDEX "QuoteLine_tenderItemId_idx" ON "QuoteLine"("tenderItemId");