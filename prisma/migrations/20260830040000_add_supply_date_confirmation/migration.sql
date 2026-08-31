-- AlterTable
ALTER TABLE "Tender" ADD COLUMN "supplyDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "deliveryDateConfirmed" BOOLEAN NOT NULL DEFAULT false;
