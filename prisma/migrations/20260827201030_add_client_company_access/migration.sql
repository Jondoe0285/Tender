-- AlterTable
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;

-- CreateTable
CREATE TABLE "ClientCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "primaryUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientCompany_primaryUserId_fkey" FOREIGN KEY ("primaryUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientCompanyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientCompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "ClientCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientCompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TenderAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "content" BLOB NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenderAttachment_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompany_primaryUserId_key" ON "ClientCompany"("primaryUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompanyMember_userId_key" ON "ClientCompanyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompanyMember_companyId_userId_key" ON "ClientCompanyMember"("companyId", "userId");

-- Existing Client accounts become the primary user of their own company workspace.
INSERT INTO "ClientCompany" ("id", "companyName", "primaryUserId", "createdAt", "updatedAt")
SELECT 'legacy-client-company-' || "id", "contactName", "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'CLIENT';

INSERT INTO "ClientCompanyMember" ("id", "companyId", "userId", "createdAt")
SELECT 'legacy-client-member-' || "id", 'legacy-client-company-' || "id", "id", CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'CLIENT';
