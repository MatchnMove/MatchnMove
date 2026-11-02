CREATE TABLE "OutreachCampaign" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "prospectId" TEXT NOT NULL REFERENCES "MoverProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdById" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "reason" TEXT,
  "initialSentAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3),
  "nextSequence" INTEGER NOT NULL DEFAULT 1,
  "nextDueAt" TIMESTAMP(3),
  "revisitAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutreachCampaign_status_check" CHECK ("status" IN ('DRAFT','ACTIVE','PAUSED','STOPPED','REVIEW_DUE','CLOSED')),
  CONSTRAINT "OutreachCampaign_sequence_check" CHECK ("nextSequence" BETWEEN 1 AND 4)
);
ALTER TABLE "OutreachMessage"
  ADD COLUMN "campaignId" TEXT REFERENCES "OutreachCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD COLUMN "templateKey" TEXT,
  ADD COLUMN "templateVersion" TEXT,
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "sendAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "retryAt" TIMESTAMP(3);
-- Preserve historical messages and legacy deduplication while allowing an
-- explicitly approved later campaign to have its own Day 0 invitation.
DROP INDEX "OutreachMessage_prospectId_quoteRequestId_sequence_key";
DROP INDEX "OutreachMessage_general_initial_key";
CREATE UNIQUE INDEX "OutreachMessage_legacy_lead_sequence_key" ON "OutreachMessage"("prospectId", "quoteRequestId", "sequence") WHERE "campaignId" IS NULL;
CREATE UNIQUE INDEX "OutreachMessage_general_initial_key" ON "OutreachMessage"("prospectId") WHERE "quoteRequestId" IS NULL AND "sequence" = 0 AND "campaignId" IS NULL;
CREATE UNIQUE INDEX "OutreachMessage_campaignId_sequence_key" ON "OutreachMessage"("campaignId", "sequence");
CREATE UNIQUE INDEX "OutreachCampaign_open_prospect_key" ON "OutreachCampaign"("prospectId") WHERE "status" IN ('DRAFT','ACTIVE','PAUSED','REVIEW_DUE');
CREATE INDEX "OutreachCampaign_status_nextDueAt_idx" ON "OutreachCampaign"("status", "nextDueAt");
CREATE INDEX "OutreachCampaign_status_revisitAt_idx" ON "OutreachCampaign"("status", "revisitAt");
CREATE INDEX "OutreachCampaign_prospectId_createdAt_idx" ON "OutreachCampaign"("prospectId", "createdAt");
