-- CreateTable
CREATE TABLE "RetailerTeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetailerTeamMember_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "RetailerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RetailerTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RetailerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "masterUserId" TEXT,
    "companyName" TEXT NOT NULL,
    "companyNumber" TEXT,
    "address" TEXT,
    "counties" TEXT NOT NULL DEFAULT '',
    "categories" TEXT NOT NULL,
    "coverageAreas" TEXT NOT NULL,
    "accreditations" TEXT,
    "launchCreditsLeft" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetailerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RetailerProfile_masterUserId_fkey" FOREIGN KEY ("masterUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RetailerProfile" ("accreditations", "categories", "companyName", "coverageAreas", "createdAt", "id", "launchCreditsLeft", "userId") SELECT "accreditations", "categories", "companyName", "coverageAreas", "createdAt", "id", "launchCreditsLeft", "userId" FROM "RetailerProfile";
DROP TABLE "RetailerProfile";
ALTER TABLE "new_RetailerProfile" RENAME TO "RetailerProfile";
CREATE UNIQUE INDEX "RetailerProfile_userId_key" ON "RetailerProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RetailerTeamMember_userId_key" ON "RetailerTeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerTeamMember_retailerId_userId_key" ON "RetailerTeamMember"("retailerId", "userId");
