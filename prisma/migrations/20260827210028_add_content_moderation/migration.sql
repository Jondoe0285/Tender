-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "reasons" TEXT NOT NULL,
    "entities" TEXT NOT NULL,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ModerationEvent_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ModerationEvent_decision_createdAt_idx" ON "ModerationEvent"("decision", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationEvent_actorId_createdAt_idx" ON "ModerationEvent"("actorId", "createdAt");
