import "server-only";

import { prisma } from "@/lib/db";
import { getMoverLeadExpiryWarningDedupeKey, getMoverNewLeadDedupeKey } from "@/lib/lead-notification";
import type { QuoteFlowPage } from "@/lib/quote-flow-types";

export const QUOTE_FLOW_PAGE_SIZE = 25;

export async function getMoverQuoteFlowPage(
  moverCompanyId: string,
  cursor?: string | null,
): Promise<QuoteFlowPage> {
  const leads = await prisma.lead.findMany({
    where: { moverCompanyId },
    select: {
      id: true,
      quoteRequestId: true,
      status: true,
      price: true,
      purchasedAt: true,
      reminderSentAt: true,
      expiresAt: true,
      expiredAt: true,
      redistributedAt: true,
      redistributionRound: true,
      createdAt: true,
      auditLogs: {
        where: { action: "lead_viewed_in_dashboard" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { createdAt: true },
      },
      quoteRequest: {
        select: {
          createdAt: true,
          bedrooms: true,
          movingWhat: true,
          fromCity: true,
          fromRegion: true,
          toCity: true,
          toRegion: true,
          moveDate: true,
          dateFlexible: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: QUOTE_FLOW_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const visibleLeads = leads.slice(0, QUOTE_FLOW_PAGE_SIZE);
  const dedupeKeys = visibleLeads.flatMap((lead) => [
    getMoverNewLeadDedupeKey(lead.id),
    getMoverLeadExpiryWarningDedupeKey(lead.id),
  ]);
  const deliveries = dedupeKeys.length
    ? await prisma.emailDelivery.findMany({
        where: {
          kind: { in: ["mover_new_lead", "mover_lead_expiry_warning"] },
          dedupeKey: { in: dedupeKeys },
        },
        select: {
          dedupeKey: true,
          kind: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          sentAt: true,
          lastError: true,
          providerMessageId: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : [];
  const deliveryByKey = new Map(deliveries.map((delivery) => [delivery.dedupeKey, delivery]));

  return {
    items: visibleLeads.map((lead) => {
      const leadDeliveries = [
        deliveryByKey.get(getMoverNewLeadDedupeKey(lead.id)),
        deliveryByKey.get(getMoverLeadExpiryWarningDedupeKey(lead.id)),
      ];

      return {
        id: lead.id,
        quoteRequestId: lead.quoteRequestId,
        status: lead.status,
        price: lead.price,
        assignedAt: lead.createdAt.toISOString(),
        viewedAt: lead.auditLogs[0]?.createdAt.toISOString() ?? null,
        purchasedAt: lead.purchasedAt?.toISOString() ?? null,
        reminderSentAt: lead.reminderSentAt?.toISOString() ?? null,
        expiresAt: lead.expiresAt?.toISOString() ?? null,
        expiredAt: lead.expiredAt?.toISOString() ?? null,
        redistributedAt: lead.redistributedAt?.toISOString() ?? null,
        redistributionRound: lead.redistributionRound,
        quote: {
          createdAt: lead.quoteRequest.createdAt.toISOString(),
          bedrooms: lead.quoteRequest.bedrooms,
          movingWhat: lead.quoteRequest.movingWhat,
          fromCity: lead.quoteRequest.fromCity,
          fromRegion: lead.quoteRequest.fromRegion,
          toCity: lead.quoteRequest.toCity,
          toRegion: lead.quoteRequest.toRegion,
          moveDate: lead.quoteRequest.moveDate?.toISOString() ?? null,
          dateFlexible: lead.quoteRequest.dateFlexible,
        },
        emailDeliveries: leadDeliveries.flatMap((delivery) => delivery
          ? [{
              kind: delivery.kind,
              status: delivery.status,
              attempts: delivery.attempts,
              maxAttempts: delivery.maxAttempts,
              sentAt: delivery.sentAt?.toISOString() ?? null,
              lastError: delivery.lastError,
              providerMessageId: delivery.providerMessageId,
              createdAt: delivery.createdAt.toISOString(),
              updatedAt: delivery.updatedAt.toISOString(),
            }]
          : []),
      };
    }),
    nextCursor: leads.length > QUOTE_FLOW_PAGE_SIZE
      ? visibleLeads[visibleLeads.length - 1]?.id ?? null
      : null,
  };
}
