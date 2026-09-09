import {
  CleanerChargeStatus,
  CleanerInvoiceStatus,
  CleaningLeadStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { CLEANING_LEAD_PRICING } from "@/lib/cleaner-lead-pricing";
import { getCleaningGeneralLocation } from "@/lib/cleaner-lead-visibility";
import { canCleanerAccessLeads } from "@/lib/cleaner-readiness";

export const CLEANER_BILLING_TIME_ZONE = "Pacific/Auckland";

const PURCHASEABLE_STATUSES = [
  CleaningLeadStatus.NEW,
  CleaningLeadStatus.NOTIFIED,
  CleaningLeadStatus.VIEWED,
] as const;

const zonedDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLEANER_BILLING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type CleanerBillingPeriod = {
  key: string;
  start: Date;
  end: Date;
  nextPeriodStart: Date;
};

export type CleanerBillingErrorCode =
  | "LEAD_NOT_FOUND"
  | "CLEANER_INACTIVE"
  | "LEAD_NOT_AVAILABLE"
  | "PURCHASE_INTEGRITY_ERROR"
  | "INVOICE_NOT_FOUND"
  | "CURRENT_PERIOD_NOT_CLOSABLE";

export class CleanerBillingError extends Error {
  constructor(
    public readonly code: CleanerBillingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CleanerBillingError";
  }
}

function getZonedDateTimeParts(value: Date): ZonedDateTimeParts {
  const values = Object.fromEntries(
    zonedDateTimeFormatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(value: Date) {
  const parts = getZonedDateTimeParts(value);
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const valueAtWholeSecond = Math.floor(value.getTime() / 1000) * 1000;
  return wallClockAsUtc - valueAtWholeSecond;
}

function aucklandWallClockToUtc(year: number, month: number, day: number) {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let candidate = wallClockAsUtc;

  // A second pass accounts for a candidate crossing a daylight-saving boundary.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const adjusted = wallClockAsUtc - getTimeZoneOffsetMs(new Date(candidate));
    if (adjusted === candidate) break;
    candidate = adjusted;
  }

  return new Date(candidate);
}

function shiftYearMonth(year: number, month: number, amount: number) {
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
  };
}

function buildCleanerBillingPeriod(year: number, month: number): CleanerBillingPeriod {
  const next = shiftYearMonth(year, month, 1);
  const start = aucklandWallClockToUtc(year, month, 1);
  const nextPeriodStart = aucklandWallClockToUtc(next.year, next.month, 1);

  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    start,
    end: new Date(nextPeriodStart.getTime() - 1),
    nextPeriodStart,
  };
}

function buildCleanerInvoiceNumber(invoice: { id: string; periodKey: string }) {
  const period = invoice.periodKey.replace(/[^0-9]/g, "");
  const suffix = invoice.id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();
  return `MNM-CLN-${period}-${suffix}`;
}

export function getCleanerBillingPeriod(at = new Date()) {
  const local = getZonedDateTimeParts(at);
  return buildCleanerBillingPeriod(local.year, local.month);
}

export function getPreviousCleanerBillingPeriod(at = new Date()) {
  const local = getZonedDateTimeParts(at);
  const previous = shiftYearMonth(local.year, local.month, -1);
  return buildCleanerBillingPeriod(previous.year, previous.month);
}

const purchasedLeadInclude = Prisma.validator<Prisma.CleaningLeadInclude>()({
  cleanerCompany: {
    select: {
      status: true,
      serviceAreas: true,
    },
  },
  purchase: {
    include: {
      invoice: true,
    },
  },
});

type PurchasedLead = Prisma.CleaningLeadGetPayload<{ include: typeof purchasedLeadInclude }>;

type CleanerLeadPurchaseResult = {
  lead: PurchasedLead;
  purchase: NonNullable<PurchasedLead["purchase"]>;
  invoice: NonNullable<PurchasedLead["purchase"]>["invoice"];
  alreadyPurchased: boolean;
};

async function readPurchasedLead(cleaningLeadId: string, cleanerCompanyId: string) {
  const lead = await prisma.cleaningLead.findFirst({
    where: {
      id: cleaningLeadId,
      cleanerCompanyId,
    },
    include: purchasedLeadInclude,
  });

  if (!lead?.purchase) return null;
  if (!canCleanerAccessLeads(lead.cleanerCompany)) {
    throw new CleanerBillingError("CLEANER_INACTIVE", "An active cleaner account with saved service regions is required to open leads.");
  }
  return {
    lead,
    purchase: lead.purchase,
    invoice: lead.purchase.invoice,
    alreadyPurchased: true,
  } satisfies CleanerLeadPurchaseResult;
}

function isKnownPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/**
 * Claims a cleaning lead, creates its one-and-only purchase, and increments the
 * current calendar-month invoice in one serializable transaction.
 */
export async function purchaseCleaningLead(input: {
  cleaningLeadId: string;
  cleanerCompanyId: string;
  purchasedAt?: Date;
}): Promise<CleanerLeadPurchaseResult> {
  const purchasedAt = input.purchasedAt ?? new Date();
  const period = getCleanerBillingPeriod(purchasedAt);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const lead = await tx.cleaningLead.findFirst({
            where: {
              id: input.cleaningLeadId,
              cleanerCompanyId: input.cleanerCompanyId,
            },
            include: purchasedLeadInclude,
          });

          if (!lead) {
            throw new CleanerBillingError("LEAD_NOT_FOUND", "Cleaning lead not found.");
          }
          if (!canCleanerAccessLeads(lead.cleanerCompany)) {
            throw new CleanerBillingError("CLEANER_INACTIVE", "An active cleaner account with saved service regions is required to open leads.");
          }
          if (lead.purchase) {
            return {
              lead,
              purchase: lead.purchase,
              invoice: lead.purchase.invoice,
              alreadyPurchased: true,
            } satisfies CleanerLeadPurchaseResult;
          }
          if (!PURCHASEABLE_STATUSES.includes(lead.status as (typeof PURCHASEABLE_STATUSES)[number])) {
            throw new CleanerBillingError("LEAD_NOT_AVAILABLE", "This cleaning lead is not available to open.");
          }

          const invoice = await tx.cleanerInvoice.upsert({
            where: {
              cleanerCompanyId_periodKey: {
                cleanerCompanyId: input.cleanerCompanyId,
                periodKey: period.key,
              },
            },
            update: {},
            create: {
              cleanerCompanyId: input.cleanerCompanyId,
              periodKey: period.key,
              periodStart: period.start,
              periodEnd: period.end,
              currency: CLEANING_LEAD_PRICING.currency,
              status: CleanerInvoiceStatus.UPCOMING,
            },
          });

          if (invoice.status !== CleanerInvoiceStatus.UPCOMING) {
            throw new CleanerBillingError("LEAD_NOT_AVAILABLE", "This billing period is already closed.");
          }

          const claim = await tx.cleaningLead.updateMany({
            where: {
              id: lead.id,
              cleanerCompanyId: input.cleanerCompanyId,
              status: { in: [...PURCHASEABLE_STATUSES] },
              purchasedAt: null,
            },
            data: {
              status: CleaningLeadStatus.PURCHASED,
              price: CLEANING_LEAD_PRICING.fixedPrice,
              purchasedAt,
            },
          });

          if (claim.count !== 1) {
            const concurrent = await tx.cleaningLead.findFirst({
              where: {
                id: lead.id,
                cleanerCompanyId: input.cleanerCompanyId,
              },
              include: purchasedLeadInclude,
            });
            if (concurrent?.purchase) {
              return {
                lead: concurrent,
                purchase: concurrent.purchase,
                invoice: concurrent.purchase.invoice,
                alreadyPurchased: true,
              } satisfies CleanerLeadPurchaseResult;
            }
            throw new CleanerBillingError(
              "PURCHASE_INTEGRITY_ERROR",
              "The cleaning lead changed while it was being opened. Please retry.",
            );
          }

          await tx.cleaningLeadPurchase.create({
            data: {
              cleaningLeadId: lead.id,
              cleanerCompanyId: input.cleanerCompanyId,
              invoiceId: invoice.id,
              amount: CLEANING_LEAD_PRICING.fixedPrice,
              currency: CLEANING_LEAD_PRICING.currency,
              billingPeriodKey: period.key,
              billingPeriodStart: period.start,
              billingPeriodEnd: period.end,
              status: CleanerChargeStatus.PENDING,
              purchasedAt,
            },
          });

          await tx.cleanerInvoice.update({
            where: { id: invoice.id },
            data: {
              leadCount: { increment: 1 },
              subtotal: { increment: CLEANING_LEAD_PRICING.fixedPrice },
              // The fixed lead price is the amount due. GST remains deliberately
              // unitemised until Match 'n Move's tax treatment is confirmed.
              total: { increment: CLEANING_LEAD_PRICING.fixedPrice },
            },
          });

          await tx.cleaningLeadAuditLog.create({
            data: {
              cleaningLeadId: lead.id,
              action: "cleaning_lead_purchased",
              meta: {
                cleanerCompanyId: input.cleanerCompanyId,
                invoiceId: invoice.id,
                amount: CLEANING_LEAD_PRICING.fixedPrice,
                currency: CLEANING_LEAD_PRICING.currency,
                billingPeriodKey: period.key,
                purchasedAt: purchasedAt.toISOString(),
              },
            },
          });

          const purchasedLead = await tx.cleaningLead.findUniqueOrThrow({
            where: { id: lead.id },
            include: purchasedLeadInclude,
          });
          if (!purchasedLead.purchase) {
            throw new CleanerBillingError(
              "PURCHASE_INTEGRITY_ERROR",
              "The cleaning lead purchase could not be verified.",
            );
          }

          return {
            lead: purchasedLead,
            purchase: purchasedLead.purchase,
            invoice: purchasedLead.purchase.invoice,
            alreadyPurchased: false,
          } satisfies CleanerLeadPurchaseResult;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isKnownPrismaError(error, "P2034") && attempt < 2) continue;
      if (isKnownPrismaError(error, "P2002")) {
        const existing = await readPurchasedLead(input.cleaningLeadId, input.cleanerCompanyId);
        if (existing) return existing;
        // Two different leads for the same cleaner can race to create the
        // cleaner/month invoice. Once the winning invoice transaction commits,
        // retry this lead against that invoice instead of surfacing a failure.
        if (attempt < 2) continue;
      }
      throw error;
    }
  }

  throw new CleanerBillingError(
    "PURCHASE_INTEGRITY_ERROR",
    "The cleaning lead could not be opened after multiple attempts.",
  );
}

function getSafeHistoryLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 24;
  return Math.min(Math.max(Math.floor(value ?? 24), 1), 60);
}

export async function getCleanerBillingSummary(
  cleanerCompanyId: string,
  options: { at?: Date; historyLimit?: number } = {},
) {
  const period = getCleanerBillingPeriod(options.at);
  const historyLimit = getSafeHistoryLimit(options.historyLimit);
  const [currentInvoice, invoiceHistory] = await Promise.all([
    prisma.cleanerInvoice.findUnique({
      where: {
        cleanerCompanyId_periodKey: {
          cleanerCompanyId,
          periodKey: period.key,
        },
      },
      include: {
        purchases: {
          orderBy: { purchasedAt: "desc" },
          select: {
            id: true,
            cleaningLeadId: true,
            amount: true,
            currency: true,
            status: true,
            purchasedAt: true,
            cleaningLead: {
              select: {
                cleaningRequest: {
                  select: {
                    quoteRequest: {
                      select: {
                        fromAddress: true,
                        fromCity: true,
                        fromRegion: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.cleanerInvoice.findMany({
      where: { cleanerCompanyId },
      orderBy: [{ periodStart: "desc" }, { id: "desc" }],
      take: historyLimit,
      select: {
        id: true,
        periodKey: true,
        periodStart: true,
        periodEnd: true,
        leadCount: true,
        subtotal: true,
        gstAmount: true,
        total: true,
        currency: true,
        status: true,
        invoiceNumber: true,
        hostedInvoiceUrl: true,
        invoicePdfUrl: true,
        issuedAt: true,
        sentAt: true,
        dueAt: true,
        paidAt: true,
      },
    }),
  ]);

  return {
    currentPeriod: period,
    nextInvoiceAt: period.nextPeriodStart,
    pricePerLead: CLEANING_LEAD_PRICING.fixedPrice,
    currency: CLEANING_LEAD_PRICING.currency,
    currentInvoice: currentInvoice
      ? {
          id: currentInvoice.id,
          status: currentInvoice.status,
          leadCount: currentInvoice.leadCount,
          subtotal: currentInvoice.subtotal,
          gstAmount: currentInvoice.gstAmount,
          total: currentInvoice.total,
          purchases: currentInvoice.purchases.map((purchase) => ({
            id: purchase.id,
            cleaningLeadId: purchase.cleaningLeadId,
            amount: purchase.amount,
            currency: purchase.currency,
            status: purchase.status,
            purchasedAt: purchase.purchasedAt,
            generalLocation: getCleaningGeneralLocation(
              purchase.cleaningLead.cleaningRequest.quoteRequest,
            ),
          })),
        }
      : null,
    invoiceHistory,
  };
}

export async function closeCleanerInvoice(invoiceId: string, closedAt = new Date()) {
  const currentPeriod = getCleanerBillingPeriod(closedAt);

  return prisma.$transaction(
    async (tx) => {
      const invoice = await tx.cleanerInvoice.findUnique({
        where: { id: invoiceId },
      });
      if (!invoice) {
        throw new CleanerBillingError("INVOICE_NOT_FOUND", "Cleaner invoice not found.");
      }
      if (invoice.status !== CleanerInvoiceStatus.UPCOMING) {
        return { invoice, closed: false } as const;
      }
      if (invoice.periodEnd >= currentPeriod.start) {
        throw new CleanerBillingError(
          "CURRENT_PERIOD_NOT_CLOSABLE",
          "The current cleaner billing period cannot be closed yet.",
        );
      }

      const aggregate = await tx.cleaningLeadPurchase.aggregate({
        where: {
          invoiceId: invoice.id,
          status: { not: CleanerChargeStatus.VOID },
        },
        _count: { _all: true },
        _sum: { amount: true },
      });
      const leadCount = aggregate._count._all;
      const subtotal = aggregate._sum.amount ?? 0;

      const claim = await tx.cleanerInvoice.updateMany({
        where: {
          id: invoice.id,
          status: CleanerInvoiceStatus.UPCOMING,
          periodEnd: { lt: currentPeriod.start },
        },
        data: {
          status: CleanerInvoiceStatus.OPEN,
          invoiceNumber: invoice.invoiceNumber ?? buildCleanerInvoiceNumber(invoice),
          leadCount,
          subtotal,
          // No GST is calculated here. The canonical fixed charge remains the invoice total,
          // while gstAmount stays null until configured accounting rules itemise it.
          gstAmount: null,
          total: subtotal,
          issuedAt: closedAt,
        },
      });

      if (claim.count !== 1) {
        const current = await tx.cleanerInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
        return { invoice: current, closed: false } as const;
      }

      await tx.cleaningLeadPurchase.updateMany({
        where: {
          invoiceId: invoice.id,
          status: CleanerChargeStatus.PENDING,
        },
        data: { status: CleanerChargeStatus.INVOICED },
      });

      await tx.adminAuditLog.create({
        data: {
          action: "cleaner_invoice_opened",
          meta: {
            cleanerCompanyId: invoice.cleanerCompanyId,
            invoiceId: invoice.id,
            periodKey: invoice.periodKey,
            leadCount,
            subtotal,
            currency: invoice.currency,
            gstAmount: null,
            closedAt: closedAt.toISOString(),
          },
        },
      });

      const closed = await tx.cleanerInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
      return { invoice: closed, closed: true } as const;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function processCleanerMonthClose(options: { at?: Date; limit?: number } = {}) {
  const at = options.at ?? new Date();
  const currentPeriod = getCleanerBillingPeriod(at);
  const requestedLimit = Number.isFinite(options.limit) ? Math.floor(options.limit as number) : 50;
  const limit = Math.min(Math.max(requestedLimit, 1), 250);
  const candidates = await prisma.cleanerInvoice.findMany({
    where: {
      status: CleanerInvoiceStatus.UPCOMING,
      periodEnd: { lt: currentPeriod.start },
    },
    orderBy: [{ periodEnd: "asc" }, { id: "asc" }],
    take: limit,
    select: { id: true },
  });

  const results: Array<{ invoiceId: string; closed: boolean; error?: string }> = [];
  for (const candidate of candidates) {
    try {
      const result = await closeCleanerInvoice(candidate.id, at);
      results.push({ invoiceId: candidate.id, closed: result.closed });
    } catch (error) {
      results.push({
        invoiceId: candidate.id,
        closed: false,
        error: error instanceof Error ? error.message : "Unknown cleaner invoice close error.",
      });
    }
  }

  return {
    checked: candidates.length,
    closed: results.filter((result) => result.closed).length,
    failed: results.filter((result) => Boolean(result.error)).length,
    results,
  };
}
