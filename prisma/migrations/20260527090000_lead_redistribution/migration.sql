ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "Lead"
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "reminderSentAt" TIMESTAMP(3),
  ADD COLUMN "expiredAt" TIMESTAMP(3),
  ADD COLUMN "redistributedAt" TIMESTAMP(3),
  ADD COLUMN "redistributionRound" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Lead_status_expiresAt_idx" ON "Lead"("status", "expiresAt");
CREATE INDEX "Lead_reminderSentAt_createdAt_idx" ON "Lead"("reminderSentAt", "createdAt");
