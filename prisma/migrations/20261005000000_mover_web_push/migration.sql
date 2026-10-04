CREATE TABLE "MoverPushSubscription" (
    "id" TEXT NOT NULL,
    "moverCompanyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MoverPushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MoverPushSubscription_endpoint_key" ON "MoverPushSubscription"("endpoint");
CREATE INDEX "MoverPushSubscription_moverCompanyId_idx" ON "MoverPushSubscription"("moverCompanyId");
ALTER TABLE "MoverPushSubscription" ADD CONSTRAINT "MoverPushSubscription_moverCompanyId_fkey" FOREIGN KEY ("moverCompanyId") REFERENCES "MoverCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MoverPushDelivery" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "leadId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'LEAD',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MoverPushDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MoverPushDelivery_dedupeKey_key" ON "MoverPushDelivery"("dedupeKey");
CREATE INDEX "MoverPushDelivery_status_nextAttemptAt_idx" ON "MoverPushDelivery"("status", "nextAttemptAt");
CREATE INDEX "MoverPushDelivery_leadId_idx" ON "MoverPushDelivery"("leadId");
ALTER TABLE "MoverPushDelivery" ADD CONSTRAINT "MoverPushDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MoverPushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MoverPushDelivery" ADD CONSTRAINT "MoverPushDelivery_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
