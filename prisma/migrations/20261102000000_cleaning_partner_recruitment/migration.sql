CREATE TYPE "PartnerBusinessType" AS ENUM ('MOVING', 'CLEANING');
ALTER TABLE "MoverProspect" ADD COLUMN "businessType" "PartnerBusinessType" NOT NULL DEFAULT 'MOVING',
  ADD COLUMN "cleanerCompanyId" TEXT;
ALTER TABLE "PartnerConversation" ADD COLUMN "cleanerCompanyId" TEXT;
ALTER TABLE "PartnerContactAssociation" ADD COLUMN "cleanerCompanyId" TEXT;
CREATE UNIQUE INDEX "MoverProspect_cleanerCompanyId_key" ON "MoverProspect"("cleanerCompanyId");
ALTER TABLE "MoverProspect" ADD CONSTRAINT "MoverProspect_cleanerCompanyId_fkey" FOREIGN KEY ("cleanerCompanyId") REFERENCES "CleanerCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerConversation" ADD CONSTRAINT "PartnerConversation_cleanerCompanyId_fkey" FOREIGN KEY ("cleanerCompanyId") REFERENCES "CleanerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerContactAssociation" ADD CONSTRAINT "PartnerContactAssociation_cleanerCompanyId_fkey" FOREIGN KEY ("cleanerCompanyId") REFERENCES "CleanerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
