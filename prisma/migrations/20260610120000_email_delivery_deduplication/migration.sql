ALTER TABLE "EmailDelivery"
ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "EmailDelivery_dedupeKey_key"
ON "EmailDelivery"("dedupeKey");
