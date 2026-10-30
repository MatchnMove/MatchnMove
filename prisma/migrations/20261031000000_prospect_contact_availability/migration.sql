-- Preserve existing contact details and leave their availability unreviewed.
ALTER TABLE "MoverProspect" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "MoverProspect" ADD COLUMN "emailAvailability" TEXT,
  ADD COLUMN "phoneAvailability" TEXT;
ALTER TABLE "MoverProspect" ADD CONSTRAINT "MoverProspect_emailAvailability_check"
  CHECK ("emailAvailability" IS NULL OR "emailAvailability" IN ('PUBLIC', 'NOT_PUBLIC'));
ALTER TABLE "MoverProspect" ADD CONSTRAINT "MoverProspect_phoneAvailability_check"
  CHECK ("phoneAvailability" IS NULL OR "phoneAvailability" IN ('PUBLIC', 'NOT_PUBLIC'));
