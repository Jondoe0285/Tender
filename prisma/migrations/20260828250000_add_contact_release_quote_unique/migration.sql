-- Prevent duplicate contact-release rows for the same quote under concurrent finalisation.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContactRelease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "releasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizingPaymentId" TEXT NOT NULL,
    CONSTRAINT "ContactRelease_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContactRelease_authorizingPaymentId_fkey" FOREIGN KEY ("authorizingPaymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ContactRelease" ("id", "tenderId", "quoteId", "clientId", "retailerId", "releasedAt", "authorizingPaymentId")
SELECT "id", "tenderId", "quoteId", "clientId", "retailerId", "releasedAt", "authorizingPaymentId" FROM "ContactRelease";
DROP TABLE "ContactRelease";
ALTER TABLE "new_ContactRelease" RENAME TO "ContactRelease";
CREATE UNIQUE INDEX "ContactRelease_quoteId_key" ON "ContactRelease"("quoteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
