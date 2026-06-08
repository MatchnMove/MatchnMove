CREATE TYPE "SpreadsheetDeliveryStatus" AS ENUM ('QUEUED', 'SENDING', 'SYNCED', 'FAILED');

CREATE TABLE "LeadSpreadsheetDelivery" (
    "id" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "status" "SpreadsheetDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadSpreadsheetDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadSpreadsheetDelivery_quoteRequestId_key"
ON "LeadSpreadsheetDelivery"("quoteRequestId");

CREATE INDEX "LeadSpreadsheetDelivery_status_nextAttemptAt_idx"
ON "LeadSpreadsheetDelivery"("status", "nextAttemptAt");

ALTER TABLE "LeadSpreadsheetDelivery"
ADD CONSTRAINT "LeadSpreadsheetDelivery_quoteRequestId_fkey"
FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
