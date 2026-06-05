import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLeadExpiryDate, getQuoteMatchedRegions, selectLeadRecipients, sendMoverNewLeadNotification } from "@/lib/lead-lifecycle";
import { calculateLeadPrice } from "@/lib/lead-pricing";
import { isMoverProfileLive } from "@/lib/mover-profile";
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

    const matchedRegions = getQuoteMatchedRegions(data);

    const matchedMovers = matchedRegions.length
      ? await prisma.moverCompany.findMany({
          where: {
            serviceAreas: { hasSome: matchedRegions },
            status: "ACTIVE",
          },
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
        })
      : [];
    const verifiedMovers = matchedMovers.filter(isMoverProfileLive);
    const selectedMovers = selectLeadRecipients(verifiedMovers);

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
    const expiresAt = getLeadExpiryDate();

    const leads = selectedMovers.length
      ? await prisma.$transaction(
          selectedMovers.map((mover) =>
            prisma.lead.create({
              data: {
                quoteRequestId: quote.id,
                moverCompanyId: mover.id,
                status: "NOTIFIED",
                price: pricing.price,
                expiresAt,
              },
              include: {
                quoteRequest: true,
                moverCompany: {
                  include: {
                    user: true,
                  },
                },
              },
            }),
          ),
        )
      : [];

    if (leads.length > 0) {
      await Promise.allSettled([
        ...leads.map((lead) => sendMoverNewLeadNotification(lead)),
        ...leads.map((lead) =>
          prisma.auditLog.create({
            data: {
              leadId: lead.id,
              action: "lead_initially_notified",
              meta: {
                quoteRequestId: quote.id,
                matchedRegions,
                expiresAt: lead.expiresAt?.toISOString() ?? null,
              },
            },
          }),
        ),
      ]);
    }

    return NextResponse.json({
      id: quote.id,
      distributedTo: selectedMovers.length,
      matchingMovers: verifiedMovers.length,
    });
  } catch (error) {
    console.error("quote POST failed", error);
    return NextResponse.json({ error: "Server failed to process quote submission." }, { status: 500 });
  }
}
