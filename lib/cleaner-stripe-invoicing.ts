import { CleanerChargeStatus, CleanerInvoiceStatus } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import {
  CLEANING_LEAD_PRICING,
  formatCleaningLeadPrice,
} from "@/lib/cleaner-lead-pricing";
import { stripe } from "@/lib/stripe";

const PURPOSE = "cleaner_monthly_invoice";

function enabled() {
  const value = process.env.CLEANER_STRIPE_INVOICING_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function dueDays() {
  const parsed = Number(process.env.CLEANER_STRIPE_INVOICE_DUE_DAYS);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 1), 90) : 14;
}

function fromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null;
}

function invoiceStatus(invoice: Stripe.Invoice) {
  if (invoice.status === "paid") return CleanerInvoiceStatus.PAID;
  if (invoice.status === "void") return CleanerInvoiceStatus.VOID;
  if (invoice.status === "uncollectible") return CleanerInvoiceStatus.OVERDUE;
  return CleanerInvoiceStatus.SENT;
}

function invoiceUpdate(invoice: Stripe.Invoice, sentAt?: Date | null) {
  const hasConfiguredTax = invoice.default_tax_rates.length > 0;
  const gstAmount = hasConfiguredTax
    ? invoice.total_tax_amounts.reduce((sum, tax) => sum + tax.amount, 0)
    : null;
  const issuedAt = fromUnix(invoice.status_transitions.finalized_at) ?? new Date(invoice.created * 1000);
  return {
    stripeInvoiceId: invoice.id,
    invoiceNumber: invoice.number || undefined,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdfUrl: invoice.invoice_pdf,
    subtotal: hasConfiguredTax
      ? invoice.total_excluding_tax ?? invoice.total - (gstAmount ?? 0)
      : invoice.total,
    gstAmount,
    total: invoice.total,
    status: invoiceStatus(invoice),
    issuedAt,
    sentAt: sentAt ?? issuedAt,
    dueAt: fromUnix(invoice.due_date),
    paidAt: fromUnix(invoice.status_transitions.paid_at),
  };
}

async function taxRateId() {
  const value = process.env.CLEANER_STRIPE_TAX_RATE_ID?.trim();
  if (!value) return null;
  if (!stripe) throw new Error("CLEANER_STRIPE_TAX_RATE_ID requires STRIPE_SECRET_KEY.");

  const rate = await stripe.taxRates.retrieve(value);
  if (!rate.active) throw new Error("CLEANER_STRIPE_TAX_RATE_ID is not active.");
  if (!rate.inclusive) throw new Error("CLEANER_STRIPE_TAX_RATE_ID must be inclusive.");
  return rate.id;
}

async function customerId(cleaner: {
  id: string;
  stripeCustomerId: string | null;
  companyName: string;
  contactPerson: string;
  phone: string;
  user: { email: string };
}) {
  if (!stripe) throw new Error("Cleaner Stripe invoicing is enabled, but STRIPE_SECRET_KEY is missing.");

  if (cleaner.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(cleaner.stripeCustomerId);
      if (!existing.deleted) return existing.id;
    } catch {
      await prisma.cleanerCompany.updateMany({
        where: { id: cleaner.id, stripeCustomerId: cleaner.stripeCustomerId },
        data: { stripeCustomerId: null },
      });
    }
  }

  const customer = await stripe.customers.create(
    {
      email: cleaner.user.email,
      name: cleaner.companyName,
      phone: cleaner.phone || undefined,
      description: `Match 'n Move cleaner account - ${cleaner.contactPerson}`,
      metadata: { purpose: PURPOSE, cleanerCompanyId: cleaner.id },
    },
    { idempotencyKey: `cleaner-customer-${cleaner.id}` },
  );

  await prisma.cleanerCompany.update({ where: { id: cleaner.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export function isCleanerStripeInvoicingEnabled() {
  return enabled();
}

export async function issueCleanerStripeInvoice(cleanerInvoiceId: string) {
  if (!enabled()) return { handled: false as const };
  if (!stripe) throw new Error("Cleaner Stripe invoicing is enabled, but STRIPE_SECRET_KEY is missing.");

  const internal = await prisma.cleanerInvoice.findUnique({
    where: { id: cleanerInvoiceId },
    include: { cleanerCompany: { include: { user: { select: { email: true } } } } },
  });
  if (!internal) throw new Error("Cleaner invoice not found.");
  if (internal.status !== CleanerInvoiceStatus.OPEN && internal.status !== CleanerInvoiceStatus.SENT) {
    return { handled: true as const, invoice: internal };
  }

  const expectedTotal = internal.leadCount * CLEANING_LEAD_PRICING.fixedPrice;
  if (internal.total <= 0 || internal.leadCount <= 0 || internal.total !== expectedTotal) {
    throw new Error("Cleaner invoice failed the fixed-price integrity check.");
  }

  const customer = await customerId(internal.cleanerCompany);
  const taxId = await taxRateId();
  let stripeInvoice: Stripe.Invoice;

  if (internal.stripeInvoiceId) {
    stripeInvoice = await stripe.invoices.retrieve(internal.stripeInvoiceId);
  } else {
    stripeInvoice = await stripe.invoices.create(
      {
        customer,
        collection_method: "send_invoice",
        days_until_due: dueDays(),
        auto_advance: false,
        currency: CLEANING_LEAD_PRICING.currency.toLowerCase(),
        default_tax_rates: taxId ? [taxId] : undefined,
        description: `Cleaning lead charges for ${internal.periodKey}`,
        footer: `Cleaning leads are charged at a fixed ${formatCleaningLeadPrice()} ${CLEANING_LEAD_PRICING.currency} per unlocked lead.`,
        custom_fields: [
          { name: "Billing period", value: internal.periodKey },
          { name: "Leads opened", value: String(internal.leadCount) },
        ],
        metadata: { purpose: PURPOSE, cleanerInvoiceId: internal.id, cleanerCompanyId: internal.cleanerCompanyId, periodKey: internal.periodKey },
      },
      { idempotencyKey: `cleaner-invoice-${internal.id}` },
    );

    await prisma.cleanerInvoice.update({ where: { id: internal.id }, data: { stripeInvoiceId: stripeInvoice.id } });
  }

  const linkedCustomer = typeof stripeInvoice.customer === "string" ? stripeInvoice.customer : stripeInvoice.customer?.id ?? null;
  if (linkedCustomer !== customer) throw new Error("The Stripe invoice customer does not match the cleaner company.");

  if (stripeInvoice.status === "draft") {
    await stripe.invoiceItems.create(
      {
        customer,
        invoice: stripeInvoice.id,
        amount: expectedTotal,
        currency: CLEANING_LEAD_PRICING.currency.toLowerCase(),
        description: `${internal.leadCount} cleaning lead${internal.leadCount === 1 ? "" : "s"} x ${formatCleaningLeadPrice()} ${CLEANING_LEAD_PRICING.currency}`,
        discountable: false,
        tax_rates: taxId ? [taxId] : undefined,
        metadata: { purpose: PURPOSE, cleanerInvoiceId: internal.id },
      },
      { idempotencyKey: `cleaner-invoice-item-${internal.id}` },
    );
    stripeInvoice = await stripe.invoices.finalizeInvoice(
      stripeInvoice.id,
      { auto_advance: false },
      { idempotencyKey: `cleaner-invoice-finalize-${internal.id}` },
    );
  }

  if (stripeInvoice.total !== expectedTotal) throw new Error(`Stripe invoice ${stripeInvoice.id} total does not equal the fixed cleaner-lead ledger total.`);

  let sentAt: Date | null = null;
  if (stripeInvoice.status === "open" && !internal.sentAt) {
    stripeInvoice = await stripe.invoices.sendInvoice(
      stripeInvoice.id,
      {},
      { idempotencyKey: `cleaner-invoice-send-${internal.id}` },
    );
    sentAt = new Date();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const invoice = await tx.cleanerInvoice.update({
      where: { id: internal.id },
      data: invoiceUpdate(stripeInvoice, sentAt),
    });
    await tx.cleaningLeadPurchase.updateMany({
      where: { invoiceId: internal.id },
      data: {
        status:
          stripeInvoice.status === "paid"
            ? CleanerChargeStatus.PAID
            : stripeInvoice.status === "void"
              ? CleanerChargeStatus.VOID
              : CleanerChargeStatus.INVOICED,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        action: "cleaner_invoice_issued_via_stripe",
        meta: { cleanerInvoiceId: internal.id, cleanerCompanyId: internal.cleanerCompanyId, stripeInvoiceId: stripeInvoice.id, periodKey: internal.periodKey, leadCount: internal.leadCount, total: stripeInvoice.total, currency: stripeInvoice.currency.toUpperCase(), taxRateConfigured: Boolean(taxId) },
      },
    });
    return invoice;
  });

  return { handled: true as const, invoice: updated };
}

export function isCleanerStripeInvoice(invoice: Stripe.Invoice) {
  const metadata = invoice.metadata ?? {};
  return metadata.purpose === PURPOSE && Boolean(metadata.cleanerInvoiceId);
}

export async function syncCleanerStripeInvoice(
  invoice: Stripe.Invoice,
  eventType: "invoice.paid" | "invoice.payment_failed" | "invoice.voided" | "invoice.marked_uncollectible",
) {
  if (!isCleanerStripeInvoice(invoice)) return false;
  const metadata = invoice.metadata ?? {};
  const cleanerInvoiceId = metadata.cleanerInvoiceId;
  if (!cleanerInvoiceId) return false;

  const known = await prisma.cleanerInvoice.findFirst({
    where: { id: cleanerInvoiceId, OR: [{ stripeInvoiceId: invoice.id }, { stripeInvoiceId: null }] },
    select: { id: true, status: true },
  });
  if (!known) return false;

  const nextInvoiceStatus =
    eventType === "invoice.paid"
      ? CleanerInvoiceStatus.PAID
      : eventType === "invoice.voided"
        ? CleanerInvoiceStatus.VOID
        : CleanerInvoiceStatus.OVERDUE;
  const nextChargeStatus =
    eventType === "invoice.paid"
      ? CleanerChargeStatus.PAID
      : eventType === "invoice.voided"
        ? CleanerChargeStatus.VOID
        : CleanerChargeStatus.FAILED;
  const issuedAt = fromUnix(invoice.status_transitions.finalized_at) ?? new Date(invoice.created * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.cleanerInvoice.update({
      where: { id: cleanerInvoiceId },
      data: { ...invoiceUpdate(invoice, issuedAt), status: nextInvoiceStatus, paidAt: eventType === "invoice.paid" ? fromUnix(invoice.status_transitions.paid_at) ?? new Date() : null },
    });
    await tx.cleaningLeadPurchase.updateMany({ where: { invoiceId: cleanerInvoiceId }, data: { status: nextChargeStatus } });
    if (known.status !== nextInvoiceStatus) {
      await tx.adminAuditLog.create({
        data: { action: `cleaner_stripe_${eventType.replace(/\./g, "_")}`, meta: { cleanerInvoiceId, stripeInvoiceId: invoice.id, fromStatus: known.status, toStatus: nextInvoiceStatus } },
      });
    }
  });

  return true;
}
