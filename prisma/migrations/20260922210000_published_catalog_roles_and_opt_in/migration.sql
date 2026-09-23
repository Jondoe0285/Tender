-- AlterTable
ALTER TABLE "ClientCompanyMember" ADD COLUMN "duties" TEXT NOT NULL DEFAULT 'RAISER,ESTIMATOR,APPROVER,AUDITOR';

UPDATE "ClientCompanyMember" AS member
SET "duties" = 'RAISER,ESTIMATOR,AUDITOR'
FROM "ClientCompany" AS company
WHERE member."companyId" = company."id"
  AND member."userId" <> company."primaryUserId";

-- AlterTable
ALTER TABLE "Tender" ADD COLUMN "allowDirectContact" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tender" ADD COLUMN "allowProfessionalInterest" BOOLEAN NOT NULL DEFAULT false;
