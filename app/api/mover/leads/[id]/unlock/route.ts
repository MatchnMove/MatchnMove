import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-12-18.acacia" });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!process.env.STRIPE_SECRET_KEY) {
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "PURCHASED", purchasedAt: new Date() } });
    return NextResponse.redirect(new URL("/mover/dashboard", req.url));
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${process.env.NEXTAUTH_URL}/mover/dashboard`,
    cancel_url: `${process.env.NEXTAUTH_URL}/mover/dashboard`,
    line_items: [{ quantity: 1, price_data: { currency: "nzd", unit_amount: lead.price, product_data: { name: "Lead unlock" } } }],
    metadata: { leadId: lead.id }
  });

  await prisma.payment.create({ data: { leadId: lead.id, amount: lead.price, stripeCheckoutId: checkout.id } });
  return NextResponse.redirect(checkout.url!);
}
