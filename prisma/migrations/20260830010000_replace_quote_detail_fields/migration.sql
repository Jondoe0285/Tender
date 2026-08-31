-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "accreditations";
ALTER TABLE "Quote" DROP COLUMN "supportingDocumentName";
ALTER TABLE "Quote" DROP COLUMN "notes";
ALTER TABLE "Quote" ADD COLUMN "additionalCharges" TEXT;
