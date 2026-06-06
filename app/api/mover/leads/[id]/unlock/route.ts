import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expireAndRedistributeLead, isLeadPastExpiry, isLeadUnlockable } from "@/lib/lead-lifecycle";
import { serializeMoverLeadQuoteRequest } from "@/lib/mover-lead-visibility";
import { isMoverProfileLive } from "@/lib/mover-profile";
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
    include: {
      quoteRequest: true,
      moverCompany: {
        include: {
          user: true,
          documents: {
            select: {
              id: true,
              type: true,
              verificationStatus: true,
            },
          },
        },
      },
    },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.moverCompany.status !== "ACTIVE") {
    return NextResponse.json({ error: "This mover account is suspended and cannot open leads." }, { status: 403 });
  }

  if (!isMoverProfileLive(lead.moverCompany)) {
    return NextResponse.json(
      { error: "Complete mover verification in the dashboard before opening new lead details." },
      { status: 403 },
    );
  }

  if (["PURCHASED", "CONTACTED", "WON"].includes(lead.status)) {
    return NextResponse.json({
      ok: true,
      unlockedAt: lead.purchasedAt?.toISOString() ?? null,
      quoteRequest: serializeMoverLeadQuoteRequest(lead.status, lead.quoteRequest),
    });
  }

  if (!isLeadUnlockable(lead.status)) {
    return NextResponse.json({ error: "This lead is no longer available to open." }, { status: 410 });
  }

  const now = new Date();
  if (isLeadPastExpiry(lead, now)) {
    await expireAndRedistributeLead(lead.id, now);
    return NextResponse.json({ error: "This lead has expired and may be redistributed to another mover." }, { status: 410 });
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

  return NextResponse.json({
    ok: true,
    unlockedAt: unlockedAt.toISOString(),
    quoteRequest: serializeMoverLeadQuoteRequest("PURCHASED", lead.quoteRequest),
  });
}
