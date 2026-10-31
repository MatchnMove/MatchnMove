-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canAccessPartnerInbox" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canSendPartnerInbox" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RecruitmentTask" ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "kind" TEXT;

-- CreateTable
CREATE TABLE "PartnerMailbox" (
    "encryptedClientConfig" TEXT,
    "id" TEXT NOT NULL DEFAULT 'support',
    "address" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "historyId" TEXT,
    "initialPageToken" TEXT,
    "initialHistoryId" TEXT,
    "draftPageToken" TEXT,
    "initialSyncComplete" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "leaseOwner" TEXT,
    "connectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerConversation" (
    "pendingProviderChanges" JSONB,
    "providerChangeError" TEXT,
    "providerChangeNextAt" TIMESTAMP(3),
    "providerChangeFailures" INTEGER NOT NULL DEFAULT 0,
    "linkReviewed" BOOLEAN NOT NULL DEFAULT false,
    "id" TEXT NOT NULL,
    "gmailThreadId" TEXT,
    "subject" TEXT NOT NULL,
    "preview" TEXT NOT NULL DEFAULT '',
    "participants" TEXT[],
    "prospectId" TEXT,
    "moverCompanyId" TEXT,
    "assignedAdminId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "waitingFor" TEXT NOT NULL DEFAULT 'TEAM',
    "labels" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 0,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "spam" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "draftOwnerId" TEXT,
    "draftLeaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMessage" (
    "composeText" TEXT,
    "outreachMessageId" TEXT,
    "outreachUpdatedAt" TIMESTAMP(3),
    "draftDirty" BOOLEAN NOT NULL DEFAULT false,
    "draftMirrorUncertain" BOOLEAN NOT NULL DEFAULT false,
    "draftMirrorUntil" TIMESTAMP(3),
    "purpose" TEXT NOT NULL DEFAULT 'OUTREACH',
    "serviceReason" TEXT,
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "gmailMessageId" TEXT,
    "gmailDraftId" TEXT,
    "rfcMessageId" TEXT,
    "inReplyTo" TEXT,
    "parentMessageId" TEXT,
    "references" TEXT[],
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SYNCED',
    "from" TEXT NOT NULL,
    "replyTo" TEXT,
    "to" TEXT[],
    "cc" TEXT[],
    "bcc" TEXT[],
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "html" TEXT,
    "providerLabels" TEXT[],
    "authorId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "sendClaim" TEXT,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAttachment" (
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "providerPartId" TEXT,
    "providerAttachmentId" TEXT,
    "contentId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT,
    "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "sha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInboxNote" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerInboxNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInboxActivity" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerInboxActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerContactAssociation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "prospectId" TEXT,
    "moverCompanyId" TEXT,
    "conversationId" TEXT,
    "verifiedBy" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerContactAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInboxOAuthState" (
    "hash" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "encryptedVerifier" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerInboxOAuthState_pkey" PRIMARY KEY ("hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMailbox_address_key" ON "PartnerMailbox"("address");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerConversation_gmailThreadId_key" ON "PartnerConversation"("gmailThreadId");

-- CreateIndex
CREATE INDEX "PartnerConversation_assignedAdminId_archived_lastMessageAt_idx" ON "PartnerConversation"("assignedAdminId", "archived", "lastMessageAt");

-- CreateIndex
CREATE INDEX "PartnerConversation_unread_lastMessageAt_idx" ON "PartnerConversation"("unread", "lastMessageAt");

-- CreateIndex
CREATE INDEX "PartnerConversation_prospectId_lastMessageAt_idx" ON "PartnerConversation"("prospectId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMessage_outreachMessageId_key" ON "PartnerMessage"("outreachMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMessage_gmailMessageId_key" ON "PartnerMessage"("gmailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMessage_gmailDraftId_key" ON "PartnerMessage"("gmailDraftId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMessage_sendClaim_key" ON "PartnerMessage"("sendClaim");

-- CreateIndex
CREATE INDEX "PartnerMessage_conversationId_receivedAt_idx" ON "PartnerMessage"("conversationId", "receivedAt");

-- CreateIndex
CREATE INDEX "PartnerMessage_status_updatedAt_idx" ON "PartnerMessage"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "PartnerMessage_rfcMessageId_idx" ON "PartnerMessage"("rfcMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAttachment_messageId_providerPartId_key" ON "PartnerAttachment"("messageId", "providerPartId");

-- CreateIndex
CREATE INDEX "PartnerInboxActivity_conversationId_createdAt_idx" ON "PartnerInboxActivity"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerContactAssociation_email_key" ON "PartnerContactAssociation"("email");

-- CreateIndex
CREATE INDEX "RecruitmentTask_conversationId_completedAt_dueAt_idx" ON "RecruitmentTask"("conversationId", "completedAt", "dueAt");

-- AddForeignKey
ALTER TABLE "RecruitmentTask" ADD CONSTRAINT "RecruitmentTask_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "PartnerConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerConversation" ADD CONSTRAINT "PartnerConversation_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "MoverProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerConversation" ADD CONSTRAINT "PartnerConversation_moverCompanyId_fkey" FOREIGN KEY ("moverCompanyId") REFERENCES "MoverCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerConversation" ADD CONSTRAINT "PartnerConversation_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMessage" ADD CONSTRAINT "PartnerMessage_outreachMessageId_fkey" FOREIGN KEY ("outreachMessageId") REFERENCES "OutreachMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMessage" ADD CONSTRAINT "PartnerMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "PartnerConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMessage" ADD CONSTRAINT "PartnerMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAttachment" ADD CONSTRAINT "PartnerAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "PartnerMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInboxNote" ADD CONSTRAINT "PartnerInboxNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "PartnerConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInboxNote" ADD CONSTRAINT "PartnerInboxNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInboxActivity" ADD CONSTRAINT "PartnerInboxActivity_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "PartnerConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerContactAssociation" ADD CONSTRAINT "PartnerContactAssociation_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "MoverProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerContactAssociation" ADD CONSTRAINT "PartnerContactAssociation_moverCompanyId_fkey" FOREIGN KEY ("moverCompanyId") REFERENCES "MoverCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerContactAssociation" ADD CONSTRAINT "PartnerContactAssociation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "PartnerConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- These checks apply only to new inbox tables; existing pipeline statuses are unchanged.
ALTER TABLE "PartnerConversation" ADD CONSTRAINT "PartnerConversation_status_check" CHECK ("status" IN ('OPEN', 'PENDING', 'RESOLVED')),
ADD CONSTRAINT "PartnerConversation_waiting_check" CHECK ("waitingFor" IN ('TEAM', 'PARTNER'));
ALTER TABLE "PartnerMessage" ADD CONSTRAINT "PartnerMessage_status_check" CHECK ("status" IN ('DRAFT', 'PROVIDER_DRAFT', 'SYNCED', 'SENT', 'SENDING', 'NEEDS_REVIEW', 'DELETED')),
ADD CONSTRAINT "PartnerMessage_direction_check" CHECK ("direction" IN ('INBOUND', 'OUTBOUND')),
ADD CONSTRAINT "PartnerMessage_purpose_check" CHECK ("purpose" IN ('REPLY', 'SERVICE', 'OUTREACH'));
ALTER TABLE "PartnerAttachment" ADD CONSTRAINT "PartnerAttachment_size_check" CHECK ("size" >= 0),
ADD CONSTRAINT "PartnerAttachment_scan_check" CHECK ("scanStatus" IN ('PENDING', 'SCANNING', 'FAILED', 'BLOCKED', 'CLEAN'));
