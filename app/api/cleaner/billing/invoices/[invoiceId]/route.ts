import { NextResponse } from "next/server";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";
import { getCleaningGeneralLocation } from "@/lib/cleaner-lead-visibility";
import { prisma } from "@/lib/db";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

export async function GET(
  _: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: privateNoStoreHeaders },
    );
  }

  const { invoiceId } = await params;
  const invoice = await prisma.cleanerInvoice.findFirst({
    where: { id: invoiceId, cleanerCompanyId: cleaner.id },
    include: {
      purchases: {
        orderBy: [{ purchasedAt: "asc" }, { id: "asc" }],
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
                    select: { fromAddress: true, fromCity: true, fromRegion: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!invoice) {
    return NextResponse.json(
      { error: "Cleaner invoice not found." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  }

  return NextResponse.json(
    {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      periodKey: invoice.periodKey,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      leadCount: invoice.leadCount,
      subtotal: invoice.subtotal,
      gstAmount: invoice.gstAmount,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      sentAt: invoice.sentAt?.toISOString() ?? null,
      dueAt: invoice.dueAt?.toISOString() ?? null,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      documentAvailable: Boolean(invoice.hostedInvoiceUrl || invoice.invoicePdfUrl),
      documentUrl: invoice.hostedInvoiceUrl || invoice.invoicePdfUrl
        ? `/api/cleaner/billing/invoices/${encodeURIComponent(invoice.id)}/document`
        : null,
      purchases: invoice.purchases.map((purchase) => ({
        id: purchase.id,
        cleaningLeadId: purchase.cleaningLeadId,
        amount: purchase.amount,
        currency: purchase.currency,
        status: purchase.status,
        purchasedAt: purchase.purchasedAt.toISOString(),
        generalLocation: getCleaningGeneralLocation(
          purchase.cleaningLead.cleaningRequest.quoteRequest,
        ),
      })),
    },
    { headers: privateNoStoreHeaders },
  );
}
