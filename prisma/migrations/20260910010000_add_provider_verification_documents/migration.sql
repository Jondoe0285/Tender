CREATE TYPE "ProviderVerificationDocumentType" AS ENUM (
  'CERTIFICATE_OF_INCORPORATION',
  'PUBLIC_LIABILITY_INSURANCE',
  'EMPLOYERS_LIABILITY_INSURANCE',
  'WASTE_CARRIERS_LICENCE',
  'PROFESSIONAL_QUALIFICATIONS',
  'PROFESSIONAL_INDEMNITY_INSURANCE',
  'SSIP_ACCREDITATION'
);

CREATE TABLE "VerificationDocument" (
  "id" TEXT NOT NULL,
  "retailerProfileId" TEXT NOT NULL,
  "documentType" "ProviderVerificationDocumentType" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "content" BYTEA NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerificationDocument_retailerProfileId_documentType_key" ON "VerificationDocument"("retailerProfileId", "documentType");

ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_retailerProfileId_fkey" FOREIGN KEY ("retailerProfileId") REFERENCES "RetailerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
