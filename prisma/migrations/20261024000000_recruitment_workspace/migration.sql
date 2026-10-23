-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'RECRUITMENT_ADMIN');

-- CreateEnum
CREATE TYPE "RecruitmentStatus" AS ENUM ('NOT_CONTACTED', 'CONTACTED', 'FOLLOW_UP_REQUIRED', 'INTERESTED', 'REGISTRATION_STARTED', 'REGISTERED', 'ACTIVE_MOVER', 'NOT_INTERESTED', 'DO_NOT_CONTACT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminDisabledAt" TIMESTAMP(3),
ADD COLUMN     "adminRole" "AdminRole",
ADD COLUMN     "canSendRecruitment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewRecruitmentLeads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSignInAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "recruitmentSharingAllowed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AdminInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'RECRUITMENT_ADMIN',
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoverProspect" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "operatingRegion" TEXT,
    "serviceAreas" TEXT[],
    "serviceTypes" TEXT[],
    "longDistance" BOOLEAN NOT NULL DEFAULT false,
    "assignedAdminId" TEXT NOT NULL,
    "status" "RecruitmentStatus" NOT NULL DEFAULT 'NOT_CONTACTED',
    "consentBasis" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "consentEvidence" TEXT,
    "consentRecordedAt" TIMESTAMP(3),
    "consentRecordedBy" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "interestedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "firstPaidLeadAt" TIMESTAMP(3),
    "recruitedById" TEXT,
    "moverCompanyId" TEXT,
    "duplicateOfId" TEXT,
    "duplicateReviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoverProspect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachMessage" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "followUpToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "attributionHash" TEXT NOT NULL,
    "attributionExpiresAt" TIMESTAMP(3) NOT NULL,
    "attributionConsumedAt" TIMESTAMP(3),
    "unsubscribeHash" TEXT NOT NULL,
    "emailDeliveryId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentTask" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedAdminId" TEXT NOT NULL,
    "prospectId" TEXT,
    "quoteRequestId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitmentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentActivity" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitmentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSuppression" (
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSuppression_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "RecruitmentSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RecruitmentProviderEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitmentProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_email_key" ON "AdminInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_tokenHash_key" ON "AdminInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "MoverProspect_email_key" ON "MoverProspect"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MoverProspect_moverCompanyId_key" ON "MoverProspect"("moverCompanyId");

-- CreateIndex
CREATE INDEX "MoverProspect_assignedAdminId_status_nextFollowUpAt_idx" ON "MoverProspect"("assignedAdminId", "status", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "MoverProspect_normalizedName_idx" ON "MoverProspect"("normalizedName");

-- CreateIndex
CREATE INDEX "MoverProspect_recruitedById_registeredAt_idx" ON "MoverProspect"("recruitedById", "registeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachMessage_followUpToId_key" ON "OutreachMessage"("followUpToId");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachMessage_attributionHash_key" ON "OutreachMessage"("attributionHash");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachMessage_unsubscribeHash_key" ON "OutreachMessage"("unsubscribeHash");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachMessage_emailDeliveryId_key" ON "OutreachMessage"("emailDeliveryId");

-- CreateIndex
CREATE INDEX "OutreachMessage_adminId_sentAt_idx" ON "OutreachMessage"("adminId", "sentAt");

-- CreateIndex
CREATE INDEX "OutreachMessage_status_createdAt_idx" ON "OutreachMessage"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachMessage_prospectId_quoteRequestId_sequence_key" ON "OutreachMessage"("prospectId", "quoteRequestId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentTask_dedupeKey_key" ON "RecruitmentTask"("dedupeKey");

-- CreateIndex
CREATE INDEX "RecruitmentTask_assignedAdminId_completedAt_dueAt_idx" ON "RecruitmentTask"("assignedAdminId", "completedAt", "dueAt");

-- CreateIndex
CREATE INDEX "RecruitmentActivity_prospectId_createdAt_idx" ON "RecruitmentActivity"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "RecruitmentActivity_actorId_action_createdAt_idx" ON "RecruitmentActivity"("actorId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "MoverProspect" ADD CONSTRAINT "MoverProspect_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoverProspect" ADD CONSTRAINT "MoverProspect_moverCompanyId_fkey" FOREIGN KEY ("moverCompanyId") REFERENCES "MoverCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "MoverProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentTask" ADD CONSTRAINT "RecruitmentTask_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentTask" ADD CONSTRAINT "RecruitmentTask_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "MoverProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentTask" ADD CONSTRAINT "RecruitmentTask_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentActivity" ADD CONSTRAINT "RecruitmentActivity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "MoverProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stage Carli only. No password, token, live account mutation or email delivery is created.
INSERT INTO "AdminInvitation" ("id", "email", "name", "role", "createdAt", "updatedAt")
SELECT 'recruitment-carli-invitation', 'carlioosterbroek@outlook.com', 'Carli', 'RECRUITMENT_ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE lower("email") = 'carlioosterbroek@outlook.com' AND "adminRole" IS NOT NULL)
ON CONFLICT ("email") DO NOTHING;

-- Application credentials cannot edit or delete privileged audit history.
-- Database operators still need independent backups and restricted migration credentials.
CREATE FUNCTION recruitment_audit_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit history is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER admin_audit_append_only BEFORE UPDATE OR DELETE ON "AdminAuditLog"
FOR EACH ROW EXECUTE FUNCTION recruitment_audit_append_only();
CREATE TRIGGER recruitment_activity_append_only BEFORE UPDATE OR DELETE ON "RecruitmentActivity"
FOR EACH ROW EXECUTE FUNCTION recruitment_audit_append_only();
