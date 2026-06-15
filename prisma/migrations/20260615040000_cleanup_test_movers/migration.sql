BEGIN;

DO $$
DECLARE
  keep_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO keep_count
  FROM "MoverCompany"
  WHERE LOWER(REGEXP_REPLACE(BTRIM("companyName"), '\s+', ' ', 'g')) = 'otago movers';

  IF keep_count <> 1 THEN
    RAISE EXCEPTION
      'Mover cleanup expected exactly one Otago Movers profile, found %. No cleanup was applied.',
      keep_count;
  END IF;
END
$$;

CREATE TEMP TABLE "_MoverCleanupKeep" ON COMMIT DROP AS
SELECT "id", "userId"
FROM "MoverCompany"
WHERE LOWER(REGEXP_REPLACE(BTRIM("companyName"), '\s+', ' ', 'g')) = 'otago movers';

CREATE TEMP TABLE "_MoverCleanupDelete" ON COMMIT DROP AS
SELECT mover."id", mover."userId", mover."companyName", mover."stripeCustomerId", app_user."email", app_user."role"
FROM "MoverCompany" mover
JOIN "User" app_user ON app_user."id" = mover."userId"
WHERE mover."id" NOT IN (SELECT "id" FROM "_MoverCleanupKeep");

CREATE TEMP TABLE "_MoverCleanupLead" ON COMMIT DROP AS
SELECT "id"
FROM "Lead"
WHERE "moverCompanyId" IN (SELECT "id" FROM "MoverCompany");

DELETE FROM "Review"
WHERE "moverCompanyId" IN (SELECT "id" FROM "MoverCompany");

DELETE FROM "ReviewSurveyInvite"
WHERE "moverCompanyId" IN (SELECT "id" FROM "MoverCompany");

DELETE FROM "Payment"
WHERE "leadId" IN (SELECT "id" FROM "_MoverCleanupLead");

DELETE FROM "AuditLog"
WHERE "leadId" IN (SELECT "id" FROM "_MoverCleanupLead");

DELETE FROM "Lead"
WHERE "id" IN (SELECT "id" FROM "_MoverCleanupLead");

DELETE FROM "PhoneVerificationCode"
WHERE "moverCompanyId" IN (SELECT "id" FROM "_MoverCleanupDelete")
   OR "userId" IN (SELECT "userId" FROM "_MoverCleanupDelete");

DELETE FROM "VerificationAudit"
WHERE "moverCompanyId" IN (SELECT "id" FROM "_MoverCleanupDelete");

DELETE FROM "MoverDocument"
WHERE "moverCompanyId" IN (SELECT "id" FROM "_MoverCleanupDelete");

DELETE FROM "AuthToken"
WHERE "userId" IN (SELECT "userId" FROM "_MoverCleanupDelete");

DELETE FROM "EmailDelivery"
WHERE "recipient" IN (SELECT "email" FROM "_MoverCleanupDelete")
  AND "kind" IN (
    'mover_verification',
    'mover_password_reset',
    'mover_sign_in_code',
    'mover_new_lead',
    'mover_lead_expiry_warning',
    'verification_expiry_warning',
    'verification_decision'
  );

DELETE FROM "AdminAuditLog"
WHERE "actorId" IN (SELECT "userId" FROM "_MoverCleanupDelete");

DELETE FROM "MoverCompany"
WHERE "id" IN (SELECT "id" FROM "_MoverCleanupDelete");

DELETE FROM "User"
WHERE "id" IN (
  SELECT "userId"
  FROM "_MoverCleanupDelete"
  WHERE "role" = 'MOVER'
);

UPDATE "MoverCompany"
SET
  "status" = 'TEST',
  "stripeCustomerId" = NULL,
  "nzbnVerificationSource" = 'TEST',
  "leaderboardEligible" = false,
  "averageRating" = 0,
  "totalReviewCount" = 0,
  "fiveStarCount" = 0,
  "fourStarCount" = 0,
  "threeStarCount" = 0,
  "twoStarCount" = 0,
  "oneStarCount" = 0,
  "communicationAverage" = 0,
  "punctualityAverage" = 0,
  "careOfBelongingsAverage" = 0,
  "professionalismAverage" = 0,
  "valueForMoneyAverage" = 0,
  "recommendationRate" = 0,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM "_MoverCleanupKeep");

COMMIT;
