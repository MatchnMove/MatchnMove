import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateLeadPrice } from "@/lib/lead-pricing";
import { canonicaliseServiceArea } from "@/lib/nz-regions";
import { quoteSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for") ?? "local";
    const ip = forwardedFor.split(",")[0]?.trim() || "local";
    if (!rateLimit(`quote:${ip}`, 10).allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const parsed = quoteSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;
    const moveDate = data.moveDate ? new Date(data.moveDate) : null;
    if (moveDate && Number.isNaN(moveDate.getTime())) {
      return NextResponse.json({ error: "Invalid move date." }, { status: 400 });
    }

    const quote = await prisma.quoteRequest.create({
      data: {
        ...data,
        moveDate,
        transcriptionState: data.transcriptRaw ? "complete" : "manual"
      }
    });

    const matchedRegions = Array.from(new Set([data.fromRegion, data.toRegion]
      .map((region) => canonicaliseServiceArea(region))
      .filter((region): region is NonNullable<typeof region> => Boolean(region))));

    const movers = matchedRegions.length
      ? await prisma.moverCompany.findMany({
          where: {
            serviceAreas: { hasSome: matchedRegions },
            status: "ACTIVE",
          },
          select: {
            id: true,
          },
        })
      : [];

    const leadRows = movers.map((mover) => {
      const pricing = calculateLeadPrice({
        bedrooms: data.bedrooms,
        moveDate,
        dateFlexible: data.dateFlexible,
        fromCity: data.fromCity,
        fromRegion: data.fromRegion,
        fromCountry: data.fromCountry,
        toCity: data.toCity,
        toRegion: data.toRegion,
        toCountry: data.toCountry,
      });

      return {
        quoteRequestId: quote.id,
        moverCompanyId: mover.id,
        status: "NOTIFIED" as const,
        price: pricing.price,
      };
    });

    if (leadRows.length > 0) {
      await prisma.lead.createMany({ data: leadRows });
    }

    return NextResponse.json({ id: quote.id, distributedTo: movers.length });
  } catch (error) {
    console.error("quote POST failed", error);
    return NextResponse.json({ error: "Server failed to process quote submission." }, { status: 500 });
  }
}
