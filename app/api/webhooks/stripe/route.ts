import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

async function updateCustomerDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  if (!stripe) return;

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === "setup") {
      const moverCompanyId = session.metadata?.moverCompanyId;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (moverCompanyId && customerId && session.setup_intent) {
        const setupIntent = await stripe.setupIntents.retrieve(String(session.setup_intent));
        const paymentMethodId =
          typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id ?? null;

        if (paymentMethodId) {
          await updateCustomerDefaultPaymentMethod(customerId, paymentMethodId);
          await prisma.moverCompany.update({
            where: { id: moverCompanyId },
            data: { stripeCustomerId: customerId },
          });
        }
      }
    }

    if (session.mode === "payment") {
      const leadId = session.metadata?.leadId;
      const moverCompanyId = session.metadata?.moverCompanyId;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      let paymentIntentId: string | null = null;
      let chargeId: string | null = null;
      let receiptUrl: string | null = null;
      let paymentMethodId: string | null = null;

      if (session.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(String(session.payment_intent), {
          expand: ["latest_charge"],
        });

        paymentIntentId = paymentIntent.id;
        paymentMethodId =
          typeof paymentIntent.payment_method === "string"
            ? paymentIntent.payment_method
            : paymentIntent.payment_method?.id ?? null;

        const charge =
          typeof paymentIntent.latest_charge === "string" || !paymentIntent.latest_charge
            ? null
            : paymentIntent.latest_charge;

        chargeId = charge?.id ?? null;
        receiptUrl = charge?.receipt_url ?? null;
      }

      if (customerId && paymentMethodId) {
        await updateCustomerDefaultPaymentMethod(customerId, paymentMethodId);
      }

      if (moverCompanyId && customerId) {
        await prisma.moverCompany.update({
          where: { id: moverCompanyId },
          data: { stripeCustomerId: customerId },
        });
      }

      if (leadId) {
        await prisma.payment.updateMany({
          where: { stripeCheckoutId: session.id },
          data: {
            status: "SUCCEEDED",
            stripePaymentIntentId: paymentIntentId,
            stripeChargeId: chargeId,
            receiptUrl,
          },
        });
        await prisma.lead.update({ where: { id: leadId }, data: { status: "PURCHASED", purchasedAt: new Date() } });
        await prisma.auditLog.create({ data: { leadId, action: "lead_unlocked", meta: { checkoutId: session.id } } });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const leadId = paymentIntent.metadata?.leadId;
    if (leadId) {
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: "FAILED" },
      });
      await prisma.auditLog.create({
        data: {
          leadId,
          action: "payment_failed",
          meta: { paymentIntentId: paymentIntent.id },
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
