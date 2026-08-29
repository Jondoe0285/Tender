/*
  Warnings:

  - You are about to drop the column `annualPriceGbp` on the `MembershipTier` table. All the data in the column will be lost.
  - Added the required column `monthlyPriceGbp` to the `MembershipTier` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MembershipTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "monthlyPriceGbp" INTEGER NOT NULL,
    "freeTenderOpportunitiesPerMonth" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_MembershipTier" ("active", "createdAt", "description", "id", "name", "updatedAt") SELECT "active", "createdAt", "description", "id", "name", "updatedAt" FROM "MembershipTier";
DROP TABLE "MembershipTier";
ALTER TABLE "new_MembershipTier" RENAME TO "MembershipTier";
CREATE UNIQUE INDEX "MembershipTier_name_key" ON "MembershipTier"("name");
CREATE TABLE "new_RetailerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "masterUserId" TEXT,
    "companyName" TEXT NOT NULL,
    "companyNumber" TEXT,
    "address" TEXT,
    "coverageScope" TEXT NOT NULL DEFAULT 'COUNTY',
    "counties" TEXT NOT NULL DEFAULT '',
    "regions" TEXT NOT NULL DEFAULT '',
    "categories" TEXT NOT NULL,
    "coverageAreas" TEXT NOT NULL,
    "accreditations" TEXT,
    "launchCreditsLeft" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetailerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RetailerProfile_masterUserId_fkey" FOREIGN KEY ("masterUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RetailerProfile" ("accreditations", "address", "categories", "companyName", "companyNumber", "counties", "coverageAreas", "createdAt", "id", "launchCreditsLeft", "masterUserId", "updatedAt", "userId") SELECT "accreditations", "address", "categories", "companyName", "companyNumber", "counties", "coverageAreas", "createdAt", "id", "launchCreditsLeft", "masterUserId", "updatedAt", "userId" FROM "RetailerProfile";
DROP TABLE "RetailerProfile";
ALTER TABLE "new_RetailerProfile" RENAME TO "RetailerProfile";
CREATE UNIQUE INDEX "RetailerProfile_userId_key" ON "RetailerProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
