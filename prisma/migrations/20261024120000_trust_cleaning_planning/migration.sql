BEGIN;
-- AlterTable
ALTER TABLE "MoverCompany" ADD COLUMN     "legacyPublicProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "movingServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "operatingRegion" TEXT,
ADD COLUMN     "profileReviewedAt" TIMESTAMP(3),
ADD COLUMN     "yearsOperatingVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "inventory" JSONB,
ADD COLUMN     "movingDistributedAt" TIMESTAMP(3),
ADD COLUMN     "toBedrooms" TEXT;

-- AlterTable
ALTER TABLE "CleaningRequest" ADD COLUMN     "accessNotes" TEXT,
ADD COLUMN     "bedrooms" TEXT,
ADD COLUMN     "carpetRooms" INTEGER,
ADD COLUMN     "destinationConsentAt" TIMESTAMP(3),
ADD COLUMN     "moverTiming" TEXT,
ADD COLUMN     "preferredDate" TIMESTAMP(3),
ADD COLUMN     "propertyEmpty" TEXT,
ADD COLUMN     "propertyType" TEXT,
ADD COLUMN     "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetAddress" TEXT,
ADD COLUMN     "targetCity" TEXT,
ADD COLUMN     "targetPostcode" TEXT,
ADD COLUMN     "targetRegion" TEXT,
ADD COLUMN     "timeWindow" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "providerResponse" TEXT,
ADD COLUMN     "responseApprovedAt" TIMESTAMP(3),
ADD COLUMN     "responseSubmittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "QuoteDraft" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRequestAccess" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerRequestAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRequestSupport" (
    "id" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerRequestSupport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "step" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteDraft_tokenHash_key" ON "QuoteDraft"("tokenHash");

-- CreateIndex
CREATE INDEX "QuoteDraft_expiresAt_idx" ON "QuoteDraft"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRequestAccess_tokenHash_key" ON "CustomerRequestAccess"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerRequestAccess_quoteRequestId_idx" ON "CustomerRequestAccess"("quoteRequestId");

-- CreateIndex
CREATE INDEX "CustomerRequestAccess_expiresAt_idx" ON "CustomerRequestAccess"("expiresAt");

-- CreateIndex
CREATE INDEX "CustomerRequestSupport_status_createdAt_idx" ON "CustomerRequestSupport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewReport_status_createdAt_idx" ON "ReviewReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConversionEvent_name_createdAt_idx" ON "ConversionEvent"("name", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerRequestAccess" ADD CONSTRAINT "CustomerRequestAccess_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequestSupport" ADD CONSTRAINT "CustomerRequestSupport_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve all existing directory eligibility while the owner reviews incomplete records.
UPDATE "MoverCompany" SET "legacyPublicProfile" = true;
-- Historical requests must not be redistributed by a later retry.
UPDATE "QuoteRequest" SET "movingDistributedAt" = "createdAt";
COMMIT;
