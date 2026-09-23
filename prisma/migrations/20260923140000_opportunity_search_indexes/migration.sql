-- Opportunity reads go through TenderMatch by retailer, not a Tender table scan.
-- These indexes support that inbox path, unread counts, and category-scoped rematch.

CREATE INDEX IF NOT EXISTS "TenderItem_tenderId_packageIndex_idx" ON "TenderItem"("tenderId", "packageIndex");
CREATE INDEX IF NOT EXISTS "TenderItem_category_idx" ON "TenderItem"("category");
CREATE INDEX IF NOT EXISTS "TenderPackage_category_idx" ON "TenderPackage"("category");
CREATE INDEX IF NOT EXISTS "TenderItemMatch_retailerId_idx" ON "TenderItemMatch"("retailerId");
CREATE INDEX IF NOT EXISTS "TenderMatch_retailerId_notifiedAt_idx" ON "TenderMatch"("retailerId", "notifiedAt");
CREATE INDEX IF NOT EXISTS "TenderMatch_retailerId_viewedAt_idx" ON "TenderMatch"("retailerId", "viewedAt");
CREATE INDEX IF NOT EXISTS "Unlock_retailerId_idx" ON "Unlock"("retailerId");
CREATE INDEX IF NOT EXISTS "Quote_retailerId_submittedAt_idx" ON "Quote"("retailerId", "submittedAt");
CREATE INDEX IF NOT EXISTS "Quote_tenderId_status_idx" ON "Quote"("tenderId", "status");
