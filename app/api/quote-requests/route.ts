import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { quoteSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`quote:${ip}`, 10).allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const parsed = quoteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const quote = await prisma.quoteRequest.create({
    data: {
      ...data,
      moveDate: data.moveDate ? new Date(data.moveDate) : null,
      transcriptionState: data.transcriptRaw ? "complete" : "manual"
    }
  });

  const movers = await prisma.moverCompany.findMany({ where: { serviceAreas: { hasSome: [data.fromCity, data.fromRegion] }, status: "ACTIVE" } });
  for (const mover of movers) {
    await prisma.lead.create({
      data: {
        quoteRequestId: quote.id,
        moverCompanyId: mover.id,
        status: "NOTIFIED",
        price: mover.baseLeadPrice + (Number(data.bedrooms) || 1) * 300
      }
    });
  }

  return NextResponse.json({ id: quote.id, distributedTo: movers.length });
}
