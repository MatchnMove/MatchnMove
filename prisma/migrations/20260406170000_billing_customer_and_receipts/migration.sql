ALTER TABLE "MoverCompany"
ADD COLUMN "stripeCustomerId" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "stripeChargeId" TEXT,
ADD COLUMN "receiptUrl" TEXT;

CREATE UNIQUE INDEX "MoverCompany_stripeCustomerId_key" ON "MoverCompany"("stripeCustomerId");
