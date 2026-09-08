import { NextResponse } from "next/server";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";
import {
  CleanerBillingError,
  purchaseCleaningLead,
} from "@/lib/cleaner-billing";
import {
  cleaningLeadForCleanerSelect,
  serializeCleaningLeadForCleaner,
} from "@/lib/cleaner-lead-visibility";
import { prisma } from "@/lib/db";
import { sendCleanerLeadUnlockedEmail } from "@/lib/email";
import {
  CLEANING_LEAD_PRICING,
  formatCleaningLeadPrice,
} from "@/lib/cleaner-lead-pricing";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000")
    .replace(/\/$/, "");
}

function formatBillingPeriod(value: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    month: "long",
    year: "numeric",
    timeZone: "Pacific/Auckland",
  }).format(value);
}

function billingErrorResponse(error: CleanerBillingError) {
  switch (error.code) {
    case "LEAD_NOT_FOUND":
      return NextResponse.json(
        { error: error.message },
        { status: 404, headers: privateNoStoreHeaders },
      );
    case "CLEANER_INACTIVE":
      return NextResponse.json(
        { error: error.message },
        { status: 403, headers: privateNoStoreHeaders },
      );
    case "LEAD_NOT_AVAILABLE":
      return NextResponse.json(
        { error: error.message },
        { status: 410, headers: privateNoStoreHeaders },
      );
    default:
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: privateNoStoreHeaders },
      );
  }
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: privateNoStoreHeaders },
    );
  }

  const { id } = await params;
  try {
    const purchase = await purchaseCleaningLead({
      cleaningLeadId: id,
      cleanerCompanyId: cleaner.id,
    });
    const lead = await prisma.cleaningLead.findFirst({
      where: { id, cleanerCompanyId: cleaner.id },
      select: cleaningLeadForCleanerSelect,
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Cleaning lead not found." },
        { status: 404, headers: privateNoStoreHeaders },
      );
    }

    let notificationSent = false;
    let notificationQueued = false;
    try {
      const notification = await sendCleanerLeadUnlockedEmail({
        leadId: lead.id,
        email: cleaner.user.email,
        cleanerName: cleaner.user.name || cleaner.contactPerson,
        dashboardUrl: `${getBaseUrl()}/cleaner/dashboard?section=leads&lead=${encodeURIComponent(lead.id)}`,
        price: purchase.purchase.amount,
        billingPeriodLabel: formatBillingPeriod(purchase.purchase.billingPeriodStart),
      });
      notificationSent = notification.sent;
      notificationQueued = notification.queued;
    } catch (error) {
      console.error("cleaner lead unlock notification failed", {
        cleaningLeadId: lead.id,
        cleanerCompanyId: cleaner.id,
        error: error instanceof Error ? error.message : "Unknown email error",
      });
    }

    return NextResponse.json(
      {
        ok: true,
        alreadyPurchased: purchase.alreadyPurchased,
        message: purchase.alreadyPurchased
          ? "This lead was already unlocked. No additional charge was added."
          : `Lead unlocked. ${formatCleaningLeadPrice()} ${CLEANING_LEAD_PRICING.currency} has been added to your current monthly invoice.`,
        lead: serializeCleaningLeadForCleaner(lead),
        charge: {
          id: purchase.purchase.id,
          amount: purchase.purchase.amount,
          currency: purchase.purchase.currency,
          purchasedAt: purchase.purchase.purchasedAt.toISOString(),
          billingPeriodKey: purchase.purchase.billingPeriodKey,
          status: purchase.purchase.status,
        },
        invoice: {
          id: purchase.invoice.id,
          periodKey: purchase.invoice.periodKey,
          leadCount: purchase.invoice.leadCount,
          subtotal: purchase.invoice.subtotal,
          gstAmount: purchase.invoice.gstAmount,
          total: purchase.invoice.total,
          currency: purchase.invoice.currency,
          status: purchase.invoice.status,
        },
        notification: {
          sent: notificationSent,
          queued: notificationQueued,
        },
      },
      { headers: privateNoStoreHeaders },
    );
  } catch (error) {
    if (error instanceof CleanerBillingError) return billingErrorResponse(error);
    console.error("cleaner lead unlock failed", {
      cleaningLeadId: id,
      cleanerCompanyId: cleaner.id,
      error: error instanceof Error ? error.message : "Unknown unlock error",
    });
    return NextResponse.json(
      { error: "The cleaning lead could not be unlocked. Please try again." },
      { status: 500, headers: privateNoStoreHeaders },
    );
  }
}
