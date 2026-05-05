import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidateAboutPage } from "@/lib/public-cache";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      moverCompany: {
        userId: session.user.id,
      },
    },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (["PURCHASED", "CONTACTED", "WON"].includes(lead.status)) {
    return NextResponse.json({ ok: true, unlockedAt: lead.purchasedAt?.toISOString() ?? null });
  }

  const unlockedAt = new Date();

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "PURCHASED", purchasedAt: unlockedAt },
  });
  await prisma.payment.upsert({
    where: { leadId: lead.id },
    update: {
      amount: lead.price,
      status: "PENDING",
      stripeCheckoutId: null,
      stripePaymentIntentId: null,
      stripeChargeId: null,
      receiptUrl: null,
    },
    create: {
      leadId: lead.id,
      amount: lead.price,
      status: "PENDING",
    },
  });
  await prisma.auditLog.create({
    data: {
      leadId: lead.id,
      action: "lead_unlocked_for_invoice",
      meta: { unlockedAt: unlockedAt.toISOString(), moverCompanyId: lead.moverCompanyId, amount: lead.price },
    },
  });

  revalidateAboutPage();

  return NextResponse.json({ ok: true, unlockedAt: unlockedAt.toISOString() });
}
