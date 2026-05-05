import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthenticatedMoverWithBilling } from "@/lib/mover-billing";
import { stripe } from "@/lib/stripe";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const mover = await requireAuthenticatedMoverWithBilling();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId } = await params;
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      lead: {
        moverCompanyId: mover.id,
      },
    },
  });

  if (!payment) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

  let receiptUrl = payment.receiptUrl;
  if (!receiptUrl && stripe && payment.stripePaymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
        expand: ["latest_charge"],
      });
      const charge =
        typeof paymentIntent.latest_charge === "string" || !paymentIntent.latest_charge
          ? null
          : paymentIntent.latest_charge;
      receiptUrl = charge?.receipt_url ?? null;
    } catch {
      receiptUrl = null;
    }
  }

  if (!receiptUrl) {
    return NextResponse.json({ error: "Receipt is not available for this payment." }, { status: 404 });
  }

  return NextResponse.redirect(receiptUrl);
}
