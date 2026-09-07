import "server-only";

import { prisma } from "@/lib/db";
import { getMoverNewLeadDedupeKey } from "@/lib/lead-notification";
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
      expiresAt: true,
      expiredAt: true,
      redistributedAt: true,
      redistributionRound: true,
      createdAt: true,
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
  const dedupeKeys = visibleLeads.map((lead) => getMoverNewLeadDedupeKey(lead.id));
  const deliveries = dedupeKeys.length
    ? await prisma.emailDelivery.findMany({
        where: {
          kind: "mover_new_lead",
          dedupeKey: { in: dedupeKeys },
        },
        select: {
          dedupeKey: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          sentAt: true,
          lastError: true,
          updatedAt: true,
        },
      })
    : [];
  const deliveryByKey = new Map(deliveries.map((delivery) => [delivery.dedupeKey, delivery]));

  return {
    items: visibleLeads.map((lead) => {
      const delivery = deliveryByKey.get(getMoverNewLeadDedupeKey(lead.id));

      return {
        id: lead.id,
        quoteRequestId: lead.quoteRequestId,
        status: lead.status,
        price: lead.price,
        assignedAt: lead.createdAt.toISOString(),
        purchasedAt: lead.purchasedAt?.toISOString() ?? null,
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
        emailDelivery: delivery
          ? {
              status: delivery.status,
              attempts: delivery.attempts,
              maxAttempts: delivery.maxAttempts,
              sentAt: delivery.sentAt?.toISOString() ?? null,
              lastError: delivery.lastError,
              updatedAt: delivery.updatedAt.toISOString(),
            }
          : null,
      };
    }),
    nextCursor: leads.length > QUOTE_FLOW_PAGE_SIZE
      ? visibleLeads[visibleLeads.length - 1]?.id ?? null
      : null,
  };
}
