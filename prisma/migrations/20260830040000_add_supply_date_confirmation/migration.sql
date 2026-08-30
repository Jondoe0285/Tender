-- AlterTable
ALTER TABLE "Tender" ADD COLUMN "supplyDate" DATETIME;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "deliveryDateConfirmed" BOOLEAN NOT NULL DEFAULT false;