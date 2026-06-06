import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoverLeadQuoteRequest } from "@/lib/mover-lead-visibility";
import { calculateMoverProfileReadiness } from "@/lib/mover-profile";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mover = await prisma.moverCompany.findUnique({
    where: { userId: session.user.id },
    include: { user: true, documents: true },
  });
  if (!mover) return NextResponse.json({ error: "Mover profile not found." }, { status: 404 });
  if (mover.status !== "ACTIVE") {
    return NextResponse.json({ error: "This mover account is suspended." }, { status: 403 });
  }
  if (!calculateMoverProfileReadiness(mover).isLive) {
    return NextResponse.json({ error: "Complete mover verification before accessing leads." }, { status: 403 });
  }

  const leads = await prisma.lead.findMany({
    where: {
      moverCompany: {
        userId: session.user.id,
      },
      status: {
        not: "EXPIRED",
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      quoteRequest: true,
    },
  });

  return NextResponse.json(
    leads.map((lead) => ({
      ...lead,
      quoteRequest: serializeMoverLeadQuoteRequest(lead.status, lead.quoteRequest),
    })),
  );
}
