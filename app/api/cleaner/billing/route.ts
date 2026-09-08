import { NextResponse } from "next/server";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";
import { getCleanerBillingSummary } from "@/lib/cleaner-billing";
import {
  CLEANING_LEAD_PRICING,
  formatCleaningLeadPrice,
} from "@/lib/cleaner-lead-pricing";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: privateNoStoreHeaders },
    );
  }

  const summary = await getCleanerBillingSummary(cleaner.id);
  return NextResponse.json(
    {
      accountStatus: cleaner.status,
      currentPeriod: {
        key: summary.currentPeriod.key,
        start: summary.currentPeriod.start.toISOString(),
        end: summary.currentPeriod.end.toISOString(),
      },
      nextInvoiceAt: summary.nextInvoiceAt.toISOString(),
      pricePerLead: summary.pricePerLead,
      currency: summary.currency,
      currentInvoice: summary.currentInvoice
        ? {
            ...summary.currentInvoice,
            purchases: summary.currentInvoice.purchases.map((purchase) => ({
              ...purchase,
              purchasedAt: purchase.purchasedAt.toISOString(),
            })),
          }
        : null,
      invoiceHistory: summary.invoiceHistory.map((invoice) => ({
        id: invoice.id,
        periodKey: invoice.periodKey,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        leadCount: invoice.leadCount,
        subtotal: invoice.subtotal,
        gstAmount: invoice.gstAmount,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        invoiceNumber: invoice.invoiceNumber,
        issuedAt: invoice.issuedAt?.toISOString() ?? null,
        sentAt: invoice.sentAt?.toISOString() ?? null,
        dueAt: invoice.dueAt?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        documentAvailable: Boolean(invoice.hostedInvoiceUrl || invoice.invoicePdfUrl),
        documentUrl: invoice.hostedInvoiceUrl || invoice.invoicePdfUrl
          ? `/api/cleaner/billing/invoices/${encodeURIComponent(invoice.id)}/document`
          : null,
      })),
      explanation: {
        leadCharge: `Each unlocked cleaning lead adds ${formatCleaningLeadPrice()} ${CLEANING_LEAD_PRICING.currency} to the current calendar-month invoice.`,
        invoicing: "One invoice is made available after the calendar month closes.",
        tax: "GST is shown only when configured on the issued invoice; no tax treatment is inferred.",
      },
    },
    { headers: privateNoStoreHeaders },
  );
}
