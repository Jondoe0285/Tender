-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeTenderId" TEXT,
    "companyName" TEXT NOT NULL,
    "primaryUserId" TEXT NOT NULL,
    "releaseCreditsLeft" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientCompany_primaryUserId_fkey" FOREIGN KEY ("primaryUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ClientCompany" ("companyName", "createdAt", "id", "primaryUserId", "tradeTenderId", "updatedAt") SELECT "companyName", "createdAt", "id", "primaryUserId", "tradeTenderId", "updatedAt" FROM "ClientCompany";
DROP TABLE "ClientCompany";
ALTER TABLE "new_ClientCompany" RENAME TO "ClientCompany";
CREATE UNIQUE INDEX "ClientCompany_tradeTenderId_key" ON "ClientCompany"("tradeTenderId");
CREATE UNIQUE INDEX "ClientCompany_primaryUserId_key" ON "ClientCompany"("primaryUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
