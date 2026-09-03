CREATE TABLE "Partner" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logoPath" TEXT NOT NULL,
  "destinationUrl" TEXT NOT NULL,
  "displayLocation" TEXT NOT NULL,
  "campaignSource" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Partner_name_key" ON "Partner"("name");
CREATE INDEX "Partner_displayLocation_active_sortOrder_idx" ON "Partner"("displayLocation", "active", "sortOrder");