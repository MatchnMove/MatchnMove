CREATE TYPE "ReviewModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "MoverCompany"
ADD COLUMN "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalReviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "fiveStarCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "fourStarCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "threeStarCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "twoStarCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "oneStarCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "communicationAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "punctualityAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "careOfBelongingsAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "professionalismAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "valueForMoneyAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "recommendationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "leaderboardEligible" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "moverCompanyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "reviewSurveyInviteId" TEXT,
    "overallRating" INTEGER NOT NULL,
    "communicationRating" INTEGER,
    "punctualityRating" INTEGER,
    "careOfBelongingsRating" INTEGER,
    "professionalismRating" INTEGER,
    "valueForMoneyRating" INTEGER,
    "writtenReview" TEXT,
    "recommendMover" BOOLEAN,
    "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'PENDING',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewSurveyInvite" (
    "id" TEXT NOT NULL,
    "moverCompanyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewSurveyInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_leadId_key" ON "Review"("leadId");
CREATE UNIQUE INDEX "Review_reviewSurveyInviteId_key" ON "Review"("reviewSurveyInviteId");
CREATE INDEX "Review_moverCompanyId_moderationStatus_isPublic_submittedAt_idx" ON "Review"("moverCompanyId", "moderationStatus", "isPublic", "submittedAt");

CREATE UNIQUE INDEX "ReviewSurveyInvite_leadId_key" ON "ReviewSurveyInvite"("leadId");
CREATE UNIQUE INDEX "ReviewSurveyInvite_tokenHash_key" ON "ReviewSurveyInvite"("tokenHash");
CREATE INDEX "ReviewSurveyInvite_moverCompanyId_expiresAt_idx" ON "ReviewSurveyInvite"("moverCompanyId", "expiresAt");

ALTER TABLE "Review" ADD CONSTRAINT "Review_moverCompanyId_fkey" FOREIGN KEY ("moverCompanyId") REFERENCES "MoverCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewSurveyInviteId_fkey" FOREIGN KEY ("reviewSurveyInviteId") REFERENCES "ReviewSurveyInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewSurveyInvite" ADD CONSTRAINT "ReviewSurveyInvite_moverCompanyId_fkey" FOREIGN KEY ("moverCompanyId") REFERENCES "MoverCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewSurveyInvite" ADD CONSTRAINT "ReviewSurveyInvite_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
