ALTER TABLE "MoverProspect" ADD COLUMN "removedAt" TIMESTAMP(3);
CREATE INDEX "MoverProspect_removedAt_idx" ON "MoverProspect"("removedAt");
