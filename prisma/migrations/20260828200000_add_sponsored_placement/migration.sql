CREATE TABLE "RetailerSponsoredPlacement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerId" TEXT NOT NULL,
    "paymentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetailerSponsoredPlacement_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RetailerSponsoredPlacement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RetailerSponsoredPlacement_paymentId_key" ON "RetailerSponsoredPlacement"("paymentId");
CREATE INDEX "RetailerSponsoredPlacement_retailerId_active_idx" ON "RetailerSponsoredPlacement"("retailerId", "active");
