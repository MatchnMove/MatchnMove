-- General company introductions do not require a customer quote request.
-- Existing invitations and their customer-consent checks are preserved.
ALTER TABLE "OutreachMessage" ALTER COLUMN "quoteRequestId" DROP NOT NULL;

-- PostgreSQL treats NULLs as distinct in the existing compound unique index.
-- Keep one initial general invitation per company; follow-ups link uniquely to a sent message.
CREATE UNIQUE INDEX "OutreachMessage_general_initial_key"
ON "OutreachMessage" ("prospectId")
WHERE "quoteRequestId" IS NULL AND "sequence" = 0;
