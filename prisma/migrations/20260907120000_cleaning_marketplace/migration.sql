ALTER TYPE "UserRole" ADD VALUE 'CLEANER';

CREATE TYPE "CleaningLocation" AS ENUM ('MOVE_OUT', 'MOVE_IN');
CREATE TYPE "CleaningLeadStatus" AS ENUM ('NEW', 'NOTIFIED', 'VIEWED', 'PURCHASED', 'CONTACTED', 'WON', 'LOST', 'ARCHIVED');
CREATE TYPE "CleanerChargeStatus" AS ENUM ('PENDING', 'INVOICED', 'PAID', 'FAILED', 'VOID');
CREATE TYPE "CleanerInvoiceStatus" AS ENUM ('UPCOMING', 'OPEN', 'SENT', 'PAID', 'OVERDUE', 'VOID');

ALTER TABLE "User"
ADD COLUMN "preferredLocale" TEXT NOT NULL DEFAULT 'en-NZ';

ALTER TABLE "QuoteRequest"
ADD COLUMN "submissionKey" TEXT,
ADD COLUMN "sharingConsentAt" TIMESTAMP(3),
ADD COLUMN "consentVersion" TEXT,
ADD COLUMN "submittedLocale" TEXT NOT NULL DEFAULT 'en-NZ';

CREATE UNIQUE INDEX "QuoteRequest_submissionKey_key" ON "QuoteRequest"("submissionKey");

CREATE TABLE "CleanerCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "companyName" TEXT NOT NULL,
    "businessDescription" TEXT,
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nzbn" TEXT,
    "yearsOperating" INTEGER,
    "logoUrl" TEXT,
    "serviceAreas" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CleanerCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CleaningRequest" (
    "id" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "location" "CleaningLocation" NOT NULL DEFAULT 'MOVE_OUT',
    "notes" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CleaningRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CleaningLead" (
    "id" TEXT NOT NULL,
    "cleaningRequestId" TEXT NOT NULL,
    "cleanerCompanyId" TEXT NOT NULL,
    "status" "CleaningLeadStatus" NOT NULL DEFAULT 'NEW',
    "price" INTEGER NOT NULL DEFAULT 1500,
    "viewedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CleaningLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CleanerInvoice" (
    "id" TEXT NOT NULL,
    "cleanerCompanyId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "leadCount" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "gstAmount" INTEGER,
    "total" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NZD',
    "status" "CleanerInvoiceStatus" NOT NULL DEFAULT 'UPCOMING',
    "stripeInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "hostedInvoiceUrl" TEXT,
    "invoicePdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CleanerInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CleaningLeadPurchase" (
    "id" TEXT NOT NULL,
    "cleaningLeadId" TEXT NOT NULL,
    "cleanerCompanyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NZD',
    "billingPeriodKey" TEXT NOT NULL,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "status" "CleanerChargeStatus" NOT NULL DEFAULT 'PENDING',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CleaningLeadPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CleaningLeadAuditLog" (
    "id" TEXT NOT NULL,
    "cleaningLeadId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CleaningLeadAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CleanerCompany_userId_key" ON "CleanerCompany"("userId");
CREATE UNIQUE INDEX "CleanerCompany_stripeCustomerId_key" ON "CleanerCompany"("stripeCustomerId");
CREATE INDEX "CleanerCompany_status_updatedAt_idx" ON "CleanerCompany"("status", "updatedAt");
CREATE UNIQUE INDEX "CleaningRequest_quoteRequestId_key" ON "CleaningRequest"("quoteRequestId");
CREATE INDEX "CleaningRequest_createdAt_idx" ON "CleaningRequest"("createdAt");
CREATE UNIQUE INDEX "CleaningLead_cleaningRequestId_cleanerCompanyId_key" ON "CleaningLead"("cleaningRequestId", "cleanerCompanyId");
CREATE INDEX "CleaningLead_cleanerCompanyId_createdAt_idx" ON "CleaningLead"("cleanerCompanyId", "createdAt");
CREATE INDEX "CleaningLead_cleanerCompanyId_status_idx" ON "CleaningLead"("cleanerCompanyId", "status");
CREATE UNIQUE INDEX "CleanerInvoice_stripeInvoiceId_key" ON "CleanerInvoice"("stripeInvoiceId");
CREATE UNIQUE INDEX "CleanerInvoice_invoiceNumber_key" ON "CleanerInvoice"("invoiceNumber");
CREATE UNIQUE INDEX "CleanerInvoice_cleanerCompanyId_periodKey_key" ON "CleanerInvoice"("cleanerCompanyId", "periodKey");
CREATE INDEX "CleanerInvoice_status_periodEnd_idx" ON "CleanerInvoice"("status", "periodEnd");
CREATE INDEX "CleanerInvoice_cleanerCompanyId_createdAt_idx" ON "CleanerInvoice"("cleanerCompanyId", "createdAt");
CREATE UNIQUE INDEX "CleaningLeadPurchase_cleaningLeadId_key" ON "CleaningLeadPurchase"("cleaningLeadId");
CREATE UNIQUE INDEX "CleaningLeadPurchase_cleanerCompanyId_cleaningLeadId_key" ON "CleaningLeadPurchase"("cleanerCompanyId", "cleaningLeadId");
CREATE INDEX "CleaningLeadPurchase_cleanerCompanyId_billingPeriodKey_idx" ON "CleaningLeadPurchase"("cleanerCompanyId", "billingPeriodKey");
CREATE INDEX "CleaningLeadPurchase_invoiceId_purchasedAt_idx" ON "CleaningLeadPurchase"("invoiceId", "purchasedAt");
CREATE INDEX "CleaningLeadPurchase_status_billingPeriodEnd_idx" ON "CleaningLeadPurchase"("status", "billingPeriodEnd");
CREATE INDEX "CleaningLeadAuditLog_cleaningLeadId_createdAt_idx" ON "CleaningLeadAuditLog"("cleaningLeadId", "createdAt");
CREATE INDEX "CleaningLeadAuditLog_action_createdAt_idx" ON "CleaningLeadAuditLog"("action", "createdAt");

ALTER TABLE "CleanerCompany" ADD CONSTRAINT "CleanerCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleaningRequest" ADD CONSTRAINT "CleaningRequest_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningLead" ADD CONSTRAINT "CleaningLead_cleaningRequestId_fkey" FOREIGN KEY ("cleaningRequestId") REFERENCES "CleaningRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningLead" ADD CONSTRAINT "CleaningLead_cleanerCompanyId_fkey" FOREIGN KEY ("cleanerCompanyId") REFERENCES "CleanerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleanerInvoice" ADD CONSTRAINT "CleanerInvoice_cleanerCompanyId_fkey" FOREIGN KEY ("cleanerCompanyId") REFERENCES "CleanerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleaningLeadPurchase" ADD CONSTRAINT "CleaningLeadPurchase_cleaningLeadId_fkey" FOREIGN KEY ("cleaningLeadId") REFERENCES "CleaningLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleaningLeadPurchase" ADD CONSTRAINT "CleaningLeadPurchase_cleanerCompanyId_fkey" FOREIGN KEY ("cleanerCompanyId") REFERENCES "CleanerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleaningLeadPurchase" ADD CONSTRAINT "CleaningLeadPurchase_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CleanerInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleaningLeadAuditLog" ADD CONSTRAINT "CleaningLeadAuditLog_cleaningLeadId_fkey" FOREIGN KEY ("cleaningLeadId") REFERENCES "CleaningLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
