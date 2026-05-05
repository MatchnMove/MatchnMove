import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LEAD_PRICING } from "@/lib/lead-pricing";
import { requireAuthenticatedMoverWithBilling, getCustomerPaymentMethod } from "@/lib/mover-billing";
import { SITE_EMAILS } from "@/lib/site-emails";
import { stripe } from "@/lib/stripe";

function formatLeadReference(payment: {
  lead: {
    quoteRequest: {
      fromCity: string;
      toCity: string;
    };
  };
}) {
  return `${payment.lead.quoteRequest.fromCity} to ${payment.lead.quoteRequest.toCity}`;
}

export async function GET() {
  const mover = await requireAuthenticatedMoverWithBilling();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.payment.findMany({
    where: { lead: { moverCompanyId: mover.id } },
    include: {
      lead: {
        include: {
          quoteRequest: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  let paymentMethod = null;
  if (mover.stripeCustomerId && stripe) {
    try {
      paymentMethod = await getCustomerPaymentMethod(mover.stripeCustomerId);
    } catch {
      paymentMethod = null;
    }
  }

  let hasActionRequired = false;

  const transactions = await Promise.all(
    payments.map(async (payment) => {
      let status = payment.status === "SUCCEEDED" ? "paid" : payment.status === "FAILED" ? "issue" : "queued";
      let receiptUrl = payment.receiptUrl;
      let receiptNumber: string | null = payment.stripeChargeId ?? payment.stripePaymentIntentId ?? null;
      let gstAmount: number | null = null;

      if (stripe && payment.stripePaymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
            expand: ["latest_charge"],
          });
          const charge =
            typeof paymentIntent.latest_charge === "string" || !paymentIntent.latest_charge
              ? null
              : paymentIntent.latest_charge;

          if (paymentIntent.status === "requires_action") {
            status = "issue";
            hasActionRequired = true;
          }
          if (charge?.refunded) status = "refunded";
          if (charge?.receipt_url) receiptUrl = charge.receipt_url;
          if (charge?.id) receiptNumber = charge.id;
          gstAmount = null;
        } catch {
          // Keep persisted payment values if Stripe lookup fails.
        }
      }

      return {
        id: payment.id,
        date: payment.createdAt.toISOString(),
        amount: payment.amount,
        status,
        leadReference: formatLeadReference(payment),
        description: payment.status === "PENDING" ? "Queued for month-end invoice" : "Lead access charge",
        receiptAvailable: Boolean(receiptUrl),
        receiptNumber,
        receiptUrl: receiptUrl ? `/api/mover/billing/receipts/${payment.id}` : null,
        gstAmount,
      };
    }),
  );

  const receipts = transactions
    .filter((transaction) => transaction.receiptAvailable)
    .map((transaction) => ({
      paymentId: transaction.id,
      number: transaction.receiptNumber,
      date: transaction.date,
      totalAmount: transaction.amount,
      gstAmount: transaction.gstAmount,
      status: transaction.status,
      downloadUrl: transaction.receiptUrl,
    }));

  const paymentHealth =
    hasActionRequired
      ? "action_required"
      : transactions.find((transaction) => transaction.status === "issue")
      ? "payment_failed"
      : paymentMethod
        ? "active"
        : stripe
          ? "no_payment_method"
          : "billing_unavailable";

  return NextResponse.json({
    paymentMethod: paymentMethod?.card
      ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        }
      : null,
    paymentHealth,
    transactions,
    receipts,
    pricingSummary: {
      baseLeadPrice: LEAD_PRICING.basePrice,
      factors: ["Large home +$10", "Urgent move +$20", "Across island +$20", "Between islands +$45"],
      note: "Leads unlock instantly and are invoiced at the end of the month.",
    },
    howItWorks: ["Open the lead immediately", "Charges are queued during the month", "One invoice is issued at month end"],
    support: {
      email: SITE_EMAILS.support,
      billingFaqUrl: "/faq",
      contactUrl: "/contact",
    },
    stripeEnabled: Boolean(stripe),
  });
}
