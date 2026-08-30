-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "vatPercentage" REAL NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "vatGbp" REAL NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "totalAmountGbp" REAL NOT NULL DEFAULT 0;

UPDATE "Payment"
SET "totalAmountGbp" = "amountGbp";