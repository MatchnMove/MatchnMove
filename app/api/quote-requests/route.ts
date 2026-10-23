import { ensureMovingDistribution } from "@/lib/quote-distribution";
import {
  buildCleaningSnapshot,
  cleaningDetailsSchema,
} from "@/lib/cleaning-request";
import {
  newPrivateToken,
  tokenHash,
  setRequestAccess,
} from "@/lib/customer-access";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CLEANING_LEAD_PRICING } from "@/lib/cleaner-lead-pricing";
import { distributeCleaningRequest } from "@/lib/cleaning-distribution";
import { sendCleanerNewLeadEmail } from "@/lib/email";
import { resolveLocale } from "@/lib/i18n/config";
import { quoteSchema } from "@/lib/validators";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { revalidateAboutPage } from "@/lib/public-cache";

const CONSENT_VERSION = "2026-10-cleaning-property-v3";

function getBaseUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    request.nextUrl.origin
  ).replace(/\/$/, "");
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
      notify: (context) =>
        sendCleanerNewLeadEmail({
          leadId: context.leadId,
          email: context.cleanerEmail,
          cleanerName: context.cleanerName,
          cleanerCompanyName: context.cleanerCompanyName,
          dashboardUrl: `${getBaseUrl(input.request)}/cleaner/dashboard?section=leads&lead=${encodeURIComponent(context.leadId)}`,
          // Email only the canonical service area. The secure dashboard can show
          // a privacy-checked locality without risking a manual street-address fallback.
          city: context.pickupServiceArea,
          region: context.pickupServiceArea,
          propertyType: context.propertyType,
          bedrooms: context.bedrooms,
          preferredDate: context.preferredDate,
          price: CLEANING_LEAD_PRICING.fixedPrice,
          preferredLocale: context.preferredLocale,
        }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown cleaning distribution failure.";
    console.error("cleaning distribution failed", {
      quoteRequestId: input.quoteRequestId,
      error: message,
    });
    await prisma.adminAuditLog
      .create({
        data: {
          action: "cleaning_distribution_failed",
          meta: {
            quoteRequestId: input.quoteRequestId,
            cleaningRequestId: input.cleaningRequestId,
            error: message,
          },
        },
      })
      .catch(() => undefined);
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
      return NextResponse.json(
        { error: "Quote request is too large." },
        { status: 413 },
      );
    }

    const raw = await req.text();
    if (raw.length > 128 * 1024)
      return NextResponse.json(
        { error: "Quote request is too large." },
        { status: 413 },
      );
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Invalid quote request." },
        { status: 400 },
      );
    }
    const parsed = quoteSchema.safeParse(input);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );

    const data = parsed.data;
    const {
      transcriptRaw,
      transcriptFields,
      clientRequestId,
      cleaningSelected,
      cleaningNotes,
      locale,
    } = data;
    // Keep the Prisma payload explicit so request-only controls such as
    // sharingConsent can never be forwarded as unknown database columns.
    const quoteData = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      movingWhat: data.movingWhat,
      inventory: data.inventory,
      toBedrooms: data.toBedrooms,
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
      return NextResponse.json(
        { error: "Invalid move date." },
        { status: 400 },
      );
    }

    const existingQuote = clientRequestId
      ? await prisma.quoteRequest.findUnique({
          where: { submissionKey: clientRequestId },
          include: { cleaningRequest: true, leads: { select: { id: true } } },
        })
      : null;

    if (existingQuote) {
      const movingDistribution = await ensureMovingDistribution(existingQuote);
      const cleaningRequest = existingQuote.cleaningRequest;
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
        distributedTo: movingDistribution.assignedCount,
        duplicate: true,
        cleaningRequested: Boolean(cleaningRequest),
        cleaningDistributedTo: cleaningDistribution?.assignedCount ?? 0,
      });
    }

    const consentAt = new Date();
    const accessToken = newPrivateToken();
    let quote;
    try {
      quote = await prisma.quoteRequest.create({
        data: {
          ...quoteData,
          customerAccess: {
            create: {
              tokenHash: tokenHash(accessToken),
              expiresAt: new Date(Date.now() + 30 * 86400000),
            },
          },
          ...(cleaningSelected
            ? {
                cleaningRequest: {
                  create: {
                    ...buildCleaningSnapshot(
                      data,
                      data.cleaningDetails ?? cleaningDetailsSchema.parse({}),
                      consentAt,
                    ),
                    notes: cleaningNotes?.trim() || null,
                    consentAt,
                  },
                },
              }
            : {}),
          submissionKey: clientRequestId || null,
          moveDate,
          sharingConsentAt: consentAt,
          recruitmentSharingAllowed: data.recruitmentSharingAllowed,
          consentVersion: CONSENT_VERSION,
          submittedLocale: resolveLocale(locale),
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
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002" ||
        !clientRequestId
      )
        throw error;
      const racedQuote = await prisma.quoteRequest.findUnique({
        where: { submissionKey: clientRequestId },
        include: { cleaningRequest: true, leads: { select: { id: true } } },
      });
      if (!racedQuote) throw error;
      const movingDistribution = await ensureMovingDistribution(racedQuote);
      const cleaningRequest = racedQuote.cleaningRequest;
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
        distributedTo: movingDistribution.assignedCount,
        duplicate: true,
        cleaningRequested: Boolean(cleaningRequest),
        cleaningDistributedTo: cleaningDistribution?.assignedCount ?? 0,
      });
    }

    await setRequestAccess(accessToken);
    revalidateAboutPage();

    const cleaningRequest = await prisma.cleaningRequest.findUnique({
      where: { quoteRequestId: quote.id },
      select: { id: true },
    });

    const movingDistribution = await ensureMovingDistribution(quote);

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
      distributedTo: movingDistribution.assignedCount,
      cleaningRequested: cleaningSelected,
      cleaningDistributedTo: cleaningDistribution?.assignedCount ?? 0,
      matchingCleaners: cleaningDistribution?.matchingCleanerCount ?? 0,
    });
  } catch (error) {
    console.error(
      "quote POST failed",
      error instanceof Error ? error.name : "Unknown error",
    );
    return NextResponse.json(
      { error: "Server failed to process quote submission." },
      { status: 500 },
    );
  }
}
