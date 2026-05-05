CREATE INDEX IF NOT EXISTS "MoverCompany_status_updatedAt_idx"
ON "MoverCompany"("status", "updatedAt");

CREATE INDEX IF NOT EXISTS "MoverDocument_moverCompanyId_createdAt_idx"
ON "MoverDocument"("moverCompanyId", "createdAt");

CREATE INDEX IF NOT EXISTS "QuoteRequest_createdAt_idx"
ON "QuoteRequest"("createdAt");

CREATE INDEX IF NOT EXISTS "Lead_quoteRequestId_idx"
ON "Lead"("quoteRequestId");

CREATE INDEX IF NOT EXISTS "Lead_moverCompanyId_createdAt_idx"
ON "Lead"("moverCompanyId", "createdAt");

CREATE INDEX IF NOT EXISTS "Lead_moverCompanyId_status_idx"
ON "Lead"("moverCompanyId", "status");

CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx"
ON "Payment"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_leadId_createdAt_idx"
ON "AuditLog"("leadId", "createdAt");
