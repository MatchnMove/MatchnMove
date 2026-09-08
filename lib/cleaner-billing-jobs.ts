import { CleanerInvoiceStatus } from "@prisma/client";
import { processCleanerMonthClose } from "@/lib/cleaner-billing";
import {
  isCleanerStripeInvoicingEnabled,
  issueCleanerStripeInvoice,
} from "@/lib/cleaner-stripe-invoicing";
import { prisma } from "@/lib/db";
import { sendCleanerInvoiceAvailableEmail } from "@/lib/email";

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000")
    .replace(/\/$/, "");
}

function getSafeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(Math.max(Math.floor(value ?? 50), 1), 250);
}

function formatPeriodLabel(value: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    month: "long",
    year: "numeric",
    timeZone: "Pacific/Auckland",
  }).format(value);
}

/**
 * Closes prior calendar-month invoices and issues each once through Stripe
 * when enabled, otherwise through the internal invoice-email fallback.
 * Calling this repeatedly is safe: invoice state, Stripe idempotency keys,
 * and email dedupe keys are persistent idempotency boundaries.
 */
export async function processCleanerBillingJobs(options: { at?: Date; limit?: number } = {}) {
  const at = options.at ?? new Date();
  const limit = getSafeLimit(options.limit);
  const monthClose = await processCleanerMonthClose({ at, limit });
  const overdueCandidates = await prisma.cleanerInvoice.findMany({
    where: {
      status: CleanerInvoiceStatus.SENT,
      dueAt: { lt: at },
      paidAt: null,
    },
    orderBy: [{ dueAt: "asc" }, { id: "asc" }],
    take: limit,
    select: { id: true, cleanerCompanyId: true, periodKey: true, dueAt: true },
  });

  let markedOverdue = 0;
  for (const candidate of overdueCandidates) {
    const changed = await prisma.$transaction(async (tx) => {
      const claim = await tx.cleanerInvoice.updateMany({
        where: {
          id: candidate.id,
          status: CleanerInvoiceStatus.SENT,
          dueAt: { lt: at },
          paidAt: null,
        },
        data: { status: CleanerInvoiceStatus.OVERDUE },
      });
      if (claim.count === 1) {
        await tx.adminAuditLog.create({
          data: {
            action: "cleaner_invoice_marked_overdue",
            meta: {
              cleanerCompanyId: candidate.cleanerCompanyId,
              cleanerInvoiceId: candidate.id,
              periodKey: candidate.periodKey,
              dueAt: candidate.dueAt?.toISOString() ?? null,
              checkedAt: at.toISOString(),
            },
          },
        });
      }
      return claim.count;
    });
    markedOverdue += changed;
  }

  const invoices = await prisma.cleanerInvoice.findMany({
    where: {
      status: CleanerInvoiceStatus.OPEN,
      sentAt: null,
    },
    orderBy: [{ periodEnd: "asc" }, { id: "asc" }],
    take: limit,
    include: {
      cleanerCompany: {
        select: {
          companyName: true,
          contactPerson: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const notificationResults: Array<{
    invoiceId: string;
    sent: boolean;
    queued: boolean;
    error?: string;
  }> = [];

  for (const invoice of invoices) {
    try {
      if (isCleanerStripeInvoicingEnabled()) {
        const stripeResult = await issueCleanerStripeInvoice(invoice.id);
        notificationResults.push({
          invoiceId: invoice.id,
          sent: stripeResult.handled,
          queued: false,
        });
        continue;
      }

      const result = await sendCleanerInvoiceAvailableEmail({
        invoiceId: invoice.id,
        email: invoice.cleanerCompany.user.email,
        cleanerName: invoice.cleanerCompany.user.name || invoice.cleanerCompany.contactPerson,
        cleanerCompanyName: invoice.cleanerCompany.companyName,
        billingUrl: `${getBaseUrl()}/cleaner/dashboard?section=billing&invoice=${encodeURIComponent(invoice.id)}`,
        periodLabel: formatPeriodLabel(invoice.periodStart),
        leadCount: invoice.leadCount,
        total: invoice.total,
      });

      if (result.sent) {
        const delivery = result.emailDeliveryId
          ? await prisma.emailDelivery.findUnique({
              where: { id: result.emailDeliveryId },
              select: { sentAt: true },
            })
          : null;
        const sentAt = delivery?.sentAt ?? at;
        await prisma.$transaction(async (tx) => {
          const claim = await tx.cleanerInvoice.updateMany({
            where: {
              id: invoice.id,
              status: CleanerInvoiceStatus.OPEN,
              sentAt: null,
            },
            data: {
              status: CleanerInvoiceStatus.SENT,
              sentAt,
            },
          });

          if (claim.count === 1) {
            await tx.adminAuditLog.create({
              data: {
                action: "cleaner_invoice_notification_sent",
                meta: {
                  cleanerCompanyId: invoice.cleanerCompanyId,
                  invoiceId: invoice.id,
                  periodKey: invoice.periodKey,
                  sentAt: sentAt.toISOString(),
                },
              },
            });
          }
        });
      }

      notificationResults.push({
        invoiceId: invoice.id,
        sent: result.sent,
        queued: result.queued,
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (error) {
      notificationResults.push({
        invoiceId: invoice.id,
        sent: false,
        queued: false,
        error: error instanceof Error ? error.message : "Unknown cleaner invoice notification error.",
      });
    }
  }

  return {
    monthClose,
    overdue: {
      checked: overdueCandidates.length,
      marked: markedOverdue,
    },
    notifications: {
      checked: invoices.length,
      sent: notificationResults.filter((result) => result.sent).length,
      queued: notificationResults.filter((result) => result.queued && !result.sent).length,
      failed: notificationResults.filter((result) => Boolean(result.error) && !result.sent).length,
      results: notificationResults,
    },
  };
}
