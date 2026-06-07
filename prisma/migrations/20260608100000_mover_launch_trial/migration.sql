-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'WAIVED';

-- CreateTable
CREATE TABLE "PlatformSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorId_createdAt_idx" ON "AdminAuditLog"("actorId", "createdAt");
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");
