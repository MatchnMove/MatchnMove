-- AlterTable
ALTER TABLE "User"
ADD COLUMN "adminMfaSecret" TEXT,
ADD COLUMN "adminMfaEnabledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MoverCompany"
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN "authorizedRepresentativeName" TEXT,
ADD COLUMN "authorizedRepresentativeRole" TEXT,
ADD COLUMN "authorityDeclaredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MoverDocument"
ALTER COLUMN "fileUrl" DROP NOT NULL,
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "sha256" TEXT,
ADD COLUMN "detectedMimeType" TEXT,
ADD COLUMN "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "expiryReminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PhoneVerificationCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "moverCompanyId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAudit" (
  "id" TEXT NOT NULL,
  "moverCompanyId" TEXT NOT NULL,
  "documentId" TEXT,
  "actorId" TEXT,
  "actorType" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previousStatus" TEXT,
  "nextStatus" TEXT,
  "reason" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MoverDocument_storageKey_key" ON "MoverDocument"("storageKey");
CREATE INDEX "MoverDocument_expiresAt_expiryReminderSentAt_idx" ON "MoverDocument"("expiresAt", "expiryReminderSentAt");
CREATE INDEX "PhoneVerificationCode_moverCompanyId_phone_createdAt_idx" ON "PhoneVerificationCode"("moverCompanyId", "phone", "createdAt");
CREATE INDEX "PhoneVerificationCode_expiresAt_consumedAt_idx" ON "PhoneVerificationCode"("expiresAt", "consumedAt");
CREATE INDEX "VerificationAudit_moverCompanyId_createdAt_idx" ON "VerificationAudit"("moverCompanyId", "createdAt");
CREATE INDEX "VerificationAudit_documentId_createdAt_idx" ON "VerificationAudit"("documentId", "createdAt");
CREATE INDEX "VerificationAudit_action_createdAt_idx" ON "VerificationAudit"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "PhoneVerificationCode" ADD CONSTRAINT "PhoneVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhoneVerificationCode" ADD CONSTRAINT "PhoneVerificationCode_moverCompanyId_fkey" FOREIGN KEY ("moverCompanyId") REFERENCES "MoverCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationAudit" ADD CONSTRAINT "VerificationAudit_moverCompanyId_fkey" FOREIGN KEY ("moverCompanyId") REFERENCES "MoverCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
