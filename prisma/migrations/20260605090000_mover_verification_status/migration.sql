ALTER TABLE "MoverCompany"
ADD COLUMN "nzbnVerificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "nzbnVerifiedAt" TIMESTAMP(3),
ADD COLUMN "nzbnRegisteredName" TEXT,
ADD COLUMN "nzbnEntityStatus" TEXT,
ADD COLUMN "nzbnVerificationSource" TEXT,
ADD COLUMN "nzbnVerificationError" TEXT;

ALTER TABLE "MoverDocument"
ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
ADD COLUMN "verificationNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT;

CREATE INDEX "MoverCompany_nzbnVerificationStatus_updatedAt_idx" ON "MoverCompany"("nzbnVerificationStatus", "updatedAt");
CREATE INDEX "MoverDocument_verificationStatus_createdAt_idx" ON "MoverDocument"("verificationStatus", "createdAt");
