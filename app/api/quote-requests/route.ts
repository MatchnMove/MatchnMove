import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CLEANING_LEAD_PRICING } from "@/lib/cleaner-lead-pricing";
import { distributeCleaningRequest } from "@/lib/cleaning-distribution";
import { sendCleanerNewLeadEmail } from "@/lib/email";
import { getLeadExpiryDate, getQuoteMatchedRegions, selectLeadRecipients, sendMoverNewLeadNotification } from "@/lib/lead-lifecycle";
import { calculateLeadPrice } from "@/lib/lead-pricing";
import { isMoverProfileLive } from "@/lib/mover-profile";
import { quoteSchema } from "@/lib/validators";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const CONSENT_VERSION = "2026-09-cleaning-v1";

function getBaseUrl(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || request.nextUrl.origin).replace(/\/$/, "");
}

async function ensureCleaningRequestSafely(input: {
  quoteRequestId: string;
  cleaningSelected: boolean;
  cleaningNotes: string | null | undefined;
  consentAt: Date;
}) {
  if (!input.cleaningSelected) return null;

  try {
    return await prisma.cleaningRequest.upsert({
      where: { quoteRequestId: input.quoteRequestId },
      update: {},
      create: {
        quoteRequestId: input.quoteRequestId,
        location: "MOVE_OUT",
        notes: input.cleaningNotes?.trim() || null,
        consentAt: input.consentAt,
      },
      select: { id: true },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cleaning request creation failure.";
    console.error("cleaning request creation failed", {
      quoteRequestId: input.quoteRequestId,
      error: message,
    });
    await prisma.adminAuditLog.create({
      data: {
        action: "cleaning_request_creation_failed",
        meta: { quoteRequestId: input.quoteRequestId, error: message },
      },
    }).catch(() => undefined);
    return null;
  }
}

async function distributeCleaningSafely(input: {
  request: NextRequest;
  cleaningRequestId: string;
  quoteRequestId: string;
  quote: {
    fromCity: string;
    fromRegion: string;
    fromPropertyType: string;
    bedrooms: string;
    moveDate: Date | null;
  };
}) {
  try {
    return await distributeCleaningRequest({
      cleaningRequestId: input.cleaningRequestId,
      notify: (context) => sendCleanerNewLeadEmail({
        leadId: context.leadId,
        email: context.cleanerEmail,
        cleanerName: context.cleanerName,
        cleanerCompanyName: context.cleanerCompanyName,
        dashboardUrl: `${getBaseUrl(input.request)}/cleaner/dashboard?section=leads&lead=${encodeURIComponent(context.leadId)}`,
        // Email only the canonical service area. The secure dashboard can show
        // a privacy-checked locality without risking a manual street-address fallback.
        city: context.pickupServiceArea,
        region: context.pickupServiceArea,
        propertyType: input.quote.fromPropertyType,
        bedrooms: input.quote.bedrooms,
        preferredDate: input.quote.moveDate,
        price: CLEANING_LEAD_PRICING.fixedPrice,
        preferredLocale: context.preferredLocale,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cleaning distribution failure.";
    console.error("cleaning distribution failed", { quoteRequestId: input.quoteRequestId, error: message });
    await prisma.adminAuditLog.create({
      data: {
        action: "cleaning_distribution_failed",
        meta: {
          quoteRequestId: input.quoteRequestId,
          cleaningRequestId: input.cleaningRequestId,
          error: message,
        },
      },
    }).catch(() => undefined);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(`quote:${ip}`, 10).allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > 128 * 1024) {
      return NextResponse.json({ error: "Quote request is too large." }, { status: 413 });
    }

    const parsed = quoteSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;
    const { transcriptRaw, transcriptFields, clientRequestId, cleaningSelected, cleaningNotes, locale } = data;
    // Keep the Prisma payload explicit so request-only controls such as
    // sharingConsent can never be forwarded as unknown database columns.
    const quoteData = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      movingWhat: data.movingWhat,
      fromPropertyType: data.fromPropertyType,
      toPropertyType: data.toPropertyType,
      bedrooms: data.bedrooms,
      fromAddress: data.fromAddress,
      fromCity: data.fromCity,
      fromRegion: data.fromRegion,
      fromPostcode: data.fromPostcode,
      fromCountry: data.fromCountry,
      toAddress: data.toAddress,
      toCity: data.toCity,
      toRegion: data.toRegion,
      toPostcode: data.toPostcode,
      toCountry: data.toCountry,
      dateFlexible: data.dateFlexible,
    };
    const moveDate = data.moveDate ? new Date(data.moveDate) : null;
    if (moveDate && Number.isNaN(moveDate.getTime())) {
      return NextResponse.json({ error: "Invalid move date." }, { status: 400 });
    }

    const existingQuote = clientRequestId
      ? await prisma.quoteRequest.findUnique({
          where: { submissionKey: clientRequestId },
          include: { cleaningRequest: true, leads: { select: { id: true } } },
        })
      : null;

    if (existingQuote) {
      const cleaningRequest = existingQuote.cleaningRequest ?? await ensureCleaningRequestSafely({
        quoteRequestId: existingQuote.id,
        cleaningSelected,
        cleaningNotes,
        consentAt: new Date(),
      });
      const cleaningDistribution = cleaningRequest
        ? await distributeCleaningSafely({
            request: req,
            cleaningRequestId: cleaningRequest.id,
            quoteRequestId: existingQuote.id,
            quote: existingQuote,
          })
        : null;

      return NextResponse.json({
        id: existingQuote.id,
        distributedTo: existingQuote.leads.length,
        duplicate: true,
        cleaningRequested: Boolean(cleaningRequest),
        cleaningDistributedTo: cleaningDistribution?.assignedCount ?? 0,
      });
    }

    const consentAt = new Date();
    let quote;
    try {
      quote = await prisma.quoteRequest.create({
        data: {
          ...quoteData,
          submissionKey: clientRequestId || null,
          moveDate,
          sharingConsentAt: consentAt,
          consentVersion: CONSENT_VERSION,
          submittedLocale: locale,
          transcriptRaw:
            transcriptRaw === null
              ? Prisma.JsonNull
              : transcriptRaw === undefined
                ? undefined
                : (transcriptRaw as Prisma.InputJsonValue),
          transcriptFields:
            transcriptFields === null
              ? Prisma.JsonNull
              : transcriptFields === undefined
                ? undefined
                : (transcriptFields as Prisma.InputJsonValue),
          transcriptionState: transcriptRaw ? "complete" : "manual",
          spreadsheetDelivery: { create: {} },
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || !clientRequestId) throw error;
      const racedQuote = await prisma.quoteRequest.findUnique({
        where: { submissionKey: clientRequestId },
        include: { cleaningRequest: true, leads: { select: { id: true } } },
      });
      if (!racedQuote) throw error;
      const cleaningRequest = racedQuote.cleaningRequest ?? await ensureCleaningRequestSafely({
        quoteRequestId: racedQuote.id,
        cleaningSelected,
        cleaningNotes,
        consentAt,
      });
      const cleaningDistribution = cleaningRequest
        ? await distributeCleaningSafely({
            request: req,
            cleaningRequestId: cleaningRequest.id,
            quoteRequestId: racedQuote.id,
            quote: racedQuote,
          })
        : null;
      return NextResponse.json({
        id: racedQuote.id,
        distributedTo: racedQuote.leads.length,
        duplicate: true,
        cleaningRequested: Boolean(cleaningRequest),
        cleaningDistributedTo: cleaningDistribution?.assignedCount ?? 0,
      });
    }

    const cleaningRequest = await ensureCleaningRequestSafely({
      quoteRequestId: quote.id,
      cleaningSelected,
      cleaningNotes,
      consentAt,
    });

    const matchedRegions = getQuoteMatchedRegions(data);
    const matchedMovers = matchedRegions.length
      ? await prisma.moverCompany.findMany({
          where: { serviceAreas: { hasSome: matchedRegions }, status: "ACTIVE" },
          include: { user: true, documents: true },
        })
      : [];
    const verifiedMovers = matchedMovers.filter(isMoverProfileLive);
    const selectedMovers = selectLeadRecipients(verifiedMovers);

    await prisma.adminAuditLog.create({
      data: {
        action: selectedMovers.length ? "quote_distribution_matched" : "quote_distribution_no_recipients",
        meta: {
          quoteRequestId: quote.id,
          matchedRegions,
          matchedMoverCount: matchedMovers.length,
          verifiedMoverCount: verifiedMovers.length,
          selectedMoverCount: selectedMovers.length,
          cleaningSelected,
        },
      },
    });

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
          selectedMovers.map((mover) => prisma.lead.create({
            data: {
              quoteRequestId: quote.id,
              moverCompanyId: mover.id,
              status: "NOTIFIED",
              price: pricing.price,
              expiresAt,
            },
            include: { quoteRequest: true, moverCompany: { include: { user: true } } },
          })),
        )
      : [];

    if (leads.length > 0) {
      await Promise.allSettled([
        ...leads.map((lead) => sendMoverNewLeadNotification(lead)),
        ...leads.map((lead) => prisma.auditLog.create({
          data: {
            leadId: lead.id,
            action: "lead_initially_notified",
            meta: { quoteRequestId: quote.id, matchedRegions, expiresAt: lead.expiresAt?.toISOString() ?? null },
          },
        })),
      ]);
    }

    const cleaningDistribution = cleaningRequest
      ? await distributeCleaningSafely({
          request: req,
          cleaningRequestId: cleaningRequest.id,
          quoteRequestId: quote.id,
          quote,
        })
      : null;

    return NextResponse.json({
      id: quote.id,
      distributedTo: selectedMovers.length,
      matchingMovers: verifiedMovers.length,
      cleaningRequested: cleaningSelected,
      cleaningDistributedTo: cleaningDistribution?.assignedCount ?? 0,
      matchingCleaners: cleaningDistribution?.matchingCleanerCount ?? 0,
    });
  } catch (error) {
    console.error("quote POST failed", error);
    return NextResponse.json({ error: "Server failed to process quote submission." }, { status: 500 });
  }
}
