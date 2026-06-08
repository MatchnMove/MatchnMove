import { randomInt } from "crypto";
import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendMoverLeadExpiryWarningEmail, sendMoverNewLeadEmail } from "@/lib/email";
import { calculateLeadPrice } from "@/lib/lead-pricing";
import { isMoverProfileLive } from "@/lib/mover-profile";
import { getQuoteServiceAreas } from "@/lib/nz-regions";

export const INITIAL_LEAD_RECIPIENT_LIMIT = 5;
export const LEAD_EXPIRY_HOURS = 48;
export const LEAD_WARNING_AFTER_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;
const ACTIVE_LEAD_STATUSES = [LeadStatus.NEW, LeadStatus.NOTIFIED, LeadStatus.VIEWED] as const;

type QuoteForLeadLifecycle = {
  id: string;
  name: string;
  bedrooms: string;
  fromAddress: string;
  fromCity: string;
  fromRegion: string;
  fromCountry: string;
  toAddress: string;
  toCity: string;
  toRegion: string;
  toCountry: string;
  moveDate: Date | null;
  dateFlexible: boolean;
};

type LeadEmailContext = {
  id: string;
  createdAt: Date;
  expiresAt: Date | null;
  quoteRequest: QuoteForLeadLifecycle;
  moverCompany: {
    companyName: string;
    contactPerson: string | null;
    user: {
      email: string;
      name: string | null;
    };
  };
};

type RedistributeResult =
  | { outcome: "redistributed"; expiredLeadId: string; replacementLeadId: string }
  | { outcome: "expired_without_recipient"; expiredLeadId: string }
  | { outcome: "skipped"; reason: string };

export function getLeadExpiryDate(start = new Date()) {
  return new Date(start.getTime() + LEAD_EXPIRY_HOURS * HOUR_MS);
}

export function getQuoteMatchedRegions(quote: Pick<QuoteForLeadLifecycle, "fromAddress" | "fromCity" | "fromRegion" | "toAddress" | "toCity" | "toRegion">) {
  return getQuoteServiceAreas(quote);
}

export function selectLeadRecipients<T>(movers: T[], limit = INITIAL_LEAD_RECIPIENT_LIMIT) {
  const safeLimit = Math.max(Math.floor(limit), 0);
  if (movers.length <= safeLimit) return movers;

  const shuffled = [...movers];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, safeLimit);
}

export function isLeadUnlockable(status: LeadStatus | string) {
  return ACTIVE_LEAD_STATUSES.includes(status as (typeof ACTIVE_LEAD_STATUSES)[number]);
}

export function isLeadPastExpiry(lead: { expiresAt: Date | null; purchasedAt?: Date | null; status: LeadStatus | string }, now = new Date()) {
  return isLeadUnlockable(lead.status) && !lead.purchasedAt && Boolean(lead.expiresAt && lead.expiresAt <= now);
}

export async function sendMoverNewLeadNotification(lead: LeadEmailContext) {
  return sendMoverNewLeadEmail(buildLeadEmailInput(lead));
}

export async function processLeadLifecycle(limit = 50) {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const now = new Date();
  const warnings = await processLeadExpiryWarnings(now, safeLimit);
  const expirations = await processLeadExpirations(now, safeLimit);

  return {
    warnings,
    expirations,
  };
}

async function processLeadExpiryWarnings(now: Date, limit: number) {
  const warningCutoff = new Date(now.getTime() - LEAD_WARNING_AFTER_HOURS * HOUR_MS);
  const leads = await prisma.lead.findMany({
    where: {
      status: { in: [...ACTIVE_LEAD_STATUSES] },
      purchasedAt: null,
      reminderSentAt: null,
      createdAt: { lte: warningCutoff },
      expiresAt: { gt: now },
    },
    include: {
      quoteRequest: true,
      moverCompany: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let claimed = 0;
  let sent = 0;
  let queued = 0;
  let failed = 0;

  for (const lead of leads) {
    const claim = await prisma.lead.updateMany({
      where: {
        id: lead.id,
        status: { in: [...ACTIVE_LEAD_STATUSES] },
        purchasedAt: null,
        reminderSentAt: null,
      },
      data: {
        reminderSentAt: now,
      },
    });

    if (claim.count !== 1) continue;

    claimed += 1;
    const result = await sendMoverLeadExpiryWarningEmail(buildLeadEmailInput(lead));
    if (result.sent) sent += 1;
    if (result.queued) queued += 1;
    if (result.error) failed += 1;
  }

  return {
    checked: leads.length,
    claimed,
    sent,
    queued,
    failed,
  };
}

async function processLeadExpirations(now: Date, limit: number) {
  const leads = await prisma.lead.findMany({
    where: {
      status: { in: [...ACTIVE_LEAD_STATUSES] },
      purchasedAt: null,
      expiredAt: null,
      expiresAt: { lte: now },
    },
    select: {
      id: true,
    },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });

  const results: RedistributeResult[] = [];
  for (const lead of leads) {
    results.push(await expireAndRedistributeLead(lead.id, now));
  }

  return {
    checked: leads.length,
    redistributed: results.filter((result) => result.outcome === "redistributed").length,
    expiredWithoutRecipient: results.filter((result) => result.outcome === "expired_without_recipient").length,
    skipped: results.filter((result) => result.outcome === "skipped").length,
    results,
  };
}

export async function expireAndRedistributeLead(leadId: string, now = new Date()): Promise<RedistributeResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      quoteRequest: true,
      moverCompany: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!lead) return { outcome: "skipped", reason: "Lead not found." };
  if (!isLeadUnlockable(lead.status)) return { outcome: "skipped", reason: "Lead is not unlockable." };
  if (lead.purchasedAt) return { outcome: "skipped", reason: "Lead has already been opened." };
  if (!lead.expiresAt || lead.expiresAt > now) return { outcome: "skipped", reason: "Lead has not reached expiry." };

  const matchedRegions = getQuoteMatchedRegions(lead.quoteRequest);
  const replacementMover = matchedRegions.length
    ? await findReplacementMover(lead.quoteRequestId, matchedRegions)
    : null;

  const redistributedAt = replacementMover ? now : null;
  const price = calculateLeadPrice({
    bedrooms: lead.quoteRequest.bedrooms,
    moveDate: lead.quoteRequest.moveDate,
    dateFlexible: lead.quoteRequest.dateFlexible,
    fromCity: lead.quoteRequest.fromCity,
    fromRegion: lead.quoteRequest.fromRegion,
    fromCountry: lead.quoteRequest.fromCountry,
    toCity: lead.quoteRequest.toCity,
    toRegion: lead.quoteRequest.toRegion,
    toCountry: lead.quoteRequest.toCountry,
  }).price;

  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.lead.updateMany({
      where: {
        id: lead.id,
        status: { in: [...ACTIVE_LEAD_STATUSES] },
        purchasedAt: null,
        expiredAt: null,
        expiresAt: { lte: now },
      },
      data: {
        status: LeadStatus.EXPIRED,
        expiredAt: now,
        redistributedAt,
      },
    });

    if (claim.count !== 1) {
      return { outcome: "skipped", reason: "Lead was already claimed." } satisfies RedistributeResult;
    }

    if (!replacementMover) {
      await tx.auditLog.create({
        data: {
          leadId: lead.id,
          action: "lead_expired_no_recipients",
          meta: {
            expiredAt: now.toISOString(),
            quoteRequestId: lead.quoteRequestId,
          },
        },
      });

      return { outcome: "expired_without_recipient", expiredLeadId: lead.id } satisfies RedistributeResult;
    }

    const replacementLead = await tx.lead.create({
      data: {
        quoteRequestId: lead.quoteRequestId,
        moverCompanyId: replacementMover.id,
        status: LeadStatus.NOTIFIED,
        price,
        expiresAt: getLeadExpiryDate(now),
        redistributionRound: lead.redistributionRound + 1,
      },
      include: {
        quoteRequest: true,
        moverCompany: {
          include: {
            user: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        leadId: lead.id,
        action: "lead_expired_redistributed",
        meta: {
          expiredAt: now.toISOString(),
          replacementLeadId: replacementLead.id,
          replacementMoverCompanyId: replacementMover.id,
          quoteRequestId: lead.quoteRequestId,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        leadId: replacementLead.id,
        action: "lead_created_from_redistribution",
        meta: {
          originalLeadId: lead.id,
          originalMoverCompanyId: lead.moverCompanyId,
          redistributionRound: replacementLead.redistributionRound,
        },
      },
    });

    return {
      outcome: "redistributed",
      expiredLeadId: lead.id,
      replacementLeadId: replacementLead.id,
      replacementLead,
    } as const;
  });

  if (result.outcome === "redistributed") {
    await sendMoverNewLeadNotification(result.replacementLead);
    return {
      outcome: "redistributed",
      expiredLeadId: result.expiredLeadId,
      replacementLeadId: result.replacementLeadId,
    };
  }

  return result;
}

async function findReplacementMover(quoteRequestId: string, matchedRegions: string[]) {
  const existingLeads = await prisma.lead.findMany({
    where: { quoteRequestId },
    select: { moverCompanyId: true },
  });
  const existingMoverIds = Array.from(new Set(existingLeads.map((lead) => lead.moverCompanyId)));

  const candidates = await prisma.moverCompany.findMany({
    where: {
      id: existingMoverIds.length ? { notIn: existingMoverIds } : undefined,
      serviceAreas: { hasSome: matchedRegions },
      status: "ACTIVE",
    },
    include: {
      user: true,
      documents: true,
    },
  });

  return selectLeadRecipients(candidates.filter(isMoverProfileLive), 1)[0] ?? null;
}

function buildLeadEmailInput(lead: LeadEmailContext) {
  return {
    email: lead.moverCompany.user.email,
    moverName: lead.moverCompany.contactPerson || lead.moverCompany.user.name || lead.moverCompany.companyName,
    moverCompanyName: lead.moverCompany.companyName,
    dashboardUrl: getLeadDashboardUrl(lead.id),
    expiresAt: lead.expiresAt ?? getLeadExpiryDate(lead.createdAt),
  };
}

function getPublicBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://www.matchnmove.co.nz").replace(/\/$/, "");
}

function getLeadDashboardUrl(leadId: string) {
  return `${getPublicBaseUrl()}/mover/dashboard?tab=leads&lead=${encodeURIComponent(leadId)}`;
}
