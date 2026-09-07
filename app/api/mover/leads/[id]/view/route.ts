import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isMoverProfileLive } from "@/lib/mover-profile";

const privateNoStoreHeaders = { "Cache-Control": "private, no-store" };
const viewableStatuses = ["NEW", "NOTIFIED"] as const;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: privateNoStoreHeaders });
  }

  const { id } = await params;
  const lead = await prisma.lead.findFirst({
    where: {
      id,
      moverCompany: { userId: session.user.id },
    },
    include: {
      moverCompany: {
        include: {
          user: true,
          documents: true,
        },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404, headers: privateNoStoreHeaders });
  }
  if (lead.moverCompany.status !== "ACTIVE" || !isMoverProfileLive(lead.moverCompany)) {
    return NextResponse.json(
      { error: "Complete mover verification before viewing assigned leads." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }

  const now = new Date();
  const isPastExpiry = Boolean(lead.expiredAt || (lead.expiresAt && lead.expiresAt <= now));
  if (isPastExpiry || lead.status === "EXPIRED") {
    return NextResponse.json(
      { ok: true, status: lead.status, viewed: false, newlyViewed: false },
      { headers: privateNoStoreHeaders },
    );
  }
  if (!viewableStatuses.includes(lead.status as (typeof viewableStatuses)[number])) {
    return NextResponse.json(
      {
        ok: true,
        status: lead.status,
        viewed: ["VIEWED", "PURCHASED", "CONTACTED", "WON", "LOST", "ARCHIVED"].includes(lead.status),
        newlyViewed: false,
      },
      { headers: privateNoStoreHeaders },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.lead.updateMany({
      where: {
        id: lead.id,
        moverCompanyId: lead.moverCompanyId,
        status: { in: [...viewableStatuses] },
        expiredAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: { status: "VIEWED" },
    });

    if (claim.count === 1) {
      await tx.auditLog.create({
        data: {
          leadId: lead.id,
          action: "lead_viewed_in_dashboard",
          meta: {
            viewedAt: now.toISOString(),
            moverCompanyId: lead.moverCompanyId,
          },
        },
      });
      return { status: "VIEWED", newlyViewed: true };
    }

    const current = await tx.lead.findUnique({
      where: { id: lead.id },
      select: { status: true },
    });
    return { status: current?.status ?? lead.status, newlyViewed: false };
  });

  return NextResponse.json(
    {
      ok: true,
      status: result.status,
      viewed: result.status === "VIEWED" || result.newlyViewed,
      newlyViewed: result.newlyViewed,
      viewedAt: result.newlyViewed ? now.toISOString() : null,
    },
    { headers: privateNoStoreHeaders },
  );
}
