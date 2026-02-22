import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-12-18.acacia" });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });

  const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const leadId = session.metadata?.leadId;
    if (leadId) {
      await prisma.payment.updateMany({ where: { stripeCheckoutId: session.id }, data: { status: "SUCCEEDED" } });
      await prisma.lead.update({ where: { id: leadId }, data: { status: "PURCHASED", purchasedAt: new Date() } });
      await prisma.auditLog.create({ data: { leadId, action: "lead_unlocked", meta: { checkoutId: session.id } } });
    }
  }
  return NextResponse.json({ received: true });
}
