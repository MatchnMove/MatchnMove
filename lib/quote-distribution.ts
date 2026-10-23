import { QuoteRequest } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getLeadExpiryDate,
  getQuoteMatchedRegions,
  selectLeadRecipients,
  sendMoverNewLeadNotification,
} from "@/lib/lead-lifecycle";
import { calculateLeadPrice } from "@/lib/lead-pricing";
import {
  canMoverAccessLeads,
  getMoverLeadAccessError,
} from "@/lib/mover-lead-access";
import { isMoverProfileLive } from "@/lib/mover-profile";
/** Lock each request so a retried submission can safely finish an interrupted
 * assignment without duplicating leads or changing a previously matched route. */
export async function ensureMovingDistribution(quote: QuoteRequest) {
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "QuoteRequest" WHERE "id" = ${quote.id} FOR UPDATE`;
      const current = await tx.quoteRequest.findUniqueOrThrow({
        where: { id: quote.id },
        select: { movingDistributedAt: true },
      });
      if (!current.movingDistributedAt) {
        const matchedRegions = getQuoteMatchedRegions(quote);
        const matched = matchedRegions.length
          ? await tx.moverCompany.findMany({
              where: {
                serviceAreas: { hasSome: matchedRegions },
                status: "ACTIVE",
              },
              include: { user: true, documents: true },
            })
          : [];
        const eligible = matched.filter(canMoverAccessLeads);
        const selected = selectLeadRecipients(eligible);
        await tx.adminAuditLog.create({
          data: {
            action: selected.length
              ? "quote_distribution_matched"
              : "quote_distribution_no_recipients",
            meta: {
              quoteRequestId: quote.id,
              matchedRegions,
              matchedMoverCount: matched.length,
              verifiedMoverCount: matched.filter(isMoverProfileLive).length,
              eligibleMoverCount: eligible.length,
              selectedMoverCount: selected.length,
              excludedMovers: matched
                .filter((m) => !canMoverAccessLeads(m))
                .map((m) => ({
                  moverCompanyId: m.id,
                  reason: getMoverLeadAccessError(m),
                })),
            },
          },
        });
        const existing = await tx.lead.findMany({
          where: { quoteRequestId: quote.id },
          select: { moverCompanyId: true },
        });
        const price = calculateLeadPrice(quote).price;
        const expiresAt = getLeadExpiryDate();
        for (const mover of selected.filter(
          (m) => !existing.some((e) => e.moverCompanyId === m.id),
        )) {
          const lead = await tx.lead.create({
            data: {
              quoteRequestId: quote.id,
              moverCompanyId: mover.id,
              status: "NOTIFIED",
              price,
              expiresAt,
            },
          });
          await tx.auditLog.create({
            data: {
              leadId: lead.id,
              action: "lead_initially_notified",
              meta: {
                quoteRequestId: quote.id,
                matchedRegions,
                expiresAt: expiresAt.toISOString(),
              },
            },
          });
        }
        await tx.quoteRequest.update({
          where: { id: quote.id },
          data: { movingDistributedAt: new Date() },
        });
      }
      return tx.lead.findMany({
        where: { quoteRequestId: quote.id },
        include: {
          quoteRequest: true,
          moverCompany: { include: { user: true } },
        },
      });
    },
    { timeout: 15000 },
  );
  await Promise.allSettled(
    result.map((lead) => sendMoverNewLeadNotification(lead)),
  );
  return { assignedCount: result.length };
}
