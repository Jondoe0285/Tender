ALTER TABLE "Partner" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "Partner_displayLocation_active_expiresAt_sortOrder_idx" ON "Partner"("displayLocation", "active", "expiresAt", "sortOrder");