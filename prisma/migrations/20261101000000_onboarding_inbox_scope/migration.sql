ALTER TABLE "PartnerConversation" ADD COLUMN "onboardingTracked" BOOLEAN NOT NULL DEFAULT false;

-- Only an actual admin-panel invitation establishes an onboarding conversation.
-- Retain unrelated imported mail, notes and attachments without exposing it in this inbox.
UPDATE "PartnerConversation" AS c SET "onboardingTracked" = true
WHERE EXISTS (SELECT 1 FROM "PartnerMessage" AS m WHERE m."conversationId" = c.id AND m."outreachMessageId" IS NOT NULL);

CREATE INDEX "PartnerConversation_onboardingTracked_lastMessageAt_idx"
ON "PartnerConversation"("onboardingTracked", "lastMessageAt");

-- Reconcile recently received replies against the invitation anchors using metadata first.
UPDATE "PartnerMailbox" SET "initialSyncComplete" = false, "initialPageToken" = NULL,
"initialHistoryId" = NULL, "historyId" = NULL, "draftPageToken" = NULL, "nextAttemptAt" = NULL;
