import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminRequest } from "@/lib/admin-auth";
import { hasSameOrigin } from "@/lib/request-origin";
import {
  businessContentSchema,
  getBusinessContent,
} from "@/lib/business-content";
import { getProfileCompleteness } from "@/lib/profile-trust";
import { recalculateMoverReviewAggregates } from "@/lib/reviews";
import { revalidatePublicMovers } from "@/lib/public-cache";
import { revalidatePath } from "next/cache";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("content"), content: businessContentSchema }),
  z.object({
    action: z.literal("profile"),
    id: z.string().max(80),
    note: z.string().trim().min(10).max(1000),
    verifyYears: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("review"),
    id: z.string().max(80),
    status: z.enum(["APPROVED", "PENDING", "REJECTED"]),
    note: z.string().trim().min(10).max(1000),
  }),
  z.object({
    action: z.literal("response"),
    id: z.string().max(80),
    approve: z.boolean(),
    note: z.string().trim().min(10).max(1000),
  }),
  z.object({ action: z.literal("support"), id: z.string().max(80) }),
  z.object({ action: z.literal("report"), id: z.string().max(80) }),
]);
export async function GET(req: NextRequest) {
  const actor = await requireAdminRequest(req);
  if (!actor)
    return NextResponse.json(
      { error: "Owner access and MFA required" },
      { status: 403 },
    );
  const since = new Date(Date.now() - 30 * 86400000);
  const [
    content,
    movers,
    cleaners,
    reviews,
    reports,
    support,
    events,
    quotes,
    cleaning,
    registrations,
    contacts,
  ] = await Promise.all([
    getBusinessContent(),
    prisma.moverCompany.findMany({
      where: { status: { not: "DELETING" } },
      select: {
        id: true,
        companyName: true,
        businessDescription: true,
        operatingRegion: true,
        movingServices: true,
        serviceAreas: true,
        legacyPublicProfile: true,
        profileReviewedAt: true,
        yearsOperating: true,
        yearsOperatingVerifiedAt: true,
        nzbnVerificationStatus: true,
        user: { select: { email: true, emailVerifiedAt: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    prisma.cleanerCompany.findMany({
      select: {
        id: true,
        companyName: true,
        businessDescription: true,
        contactPerson: true,
        phone: true,
        serviceAreas: true,
        status: true,
        user: { select: { emailVerifiedAt: true } },
      },
      take: 500,
    }),
    prisma.review.findMany({
      where: {
        OR: [
          { moderationStatus: "PENDING" },
          { responseSubmittedAt: { not: null }, responseApprovedAt: null },
        ],
      },
      select: {
        id: true,
        writtenReview: true,
        overallRating: true,
        moderationStatus: true,
        providerResponse: true,
        responseApprovedAt: true,
        moverCompany: { select: { companyName: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 100,
    }),
    prisma.reviewReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        review: {
          select: {
            writtenReview: true,
            moderationStatus: true,
            moverCompany: { select: { companyName: true } },
          },
        },
      },
    }),
    prisma.customerRequestSupport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        quoteRequestId: true,
        message: true,
        createdAt: true,
      },
    }),
    prisma.conversionEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.quoteRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.cleaningRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.user.groupBy({
      by: ["role"],
      where: { createdAt: { gte: since }, role: { in: ["MOVER", "CLEANER"] } },
      _count: { _all: true },
    }),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  return NextResponse.json(
    {
      content,
      movers: movers.map((m) => ({
        ...m,
        completeness: getProfileCompleteness(m),
      })),
      cleaners: cleaners.map((c) => ({
        id: c.id,
        companyName: c.companyName,
        status: c.status,
        missing: [
          ...(!c.user.emailVerifiedAt ? ["Email confirmation"] : []),
          ...(!c.serviceAreas.length ? ["Service regions"] : []),
          ...((c.businessDescription?.length ?? 0) < 80
            ? ["Business description"]
            : []),
          ...(!c.contactPerson || !c.phone ? ["Contact details"] : []),
        ],
      })),
      reviews,
      reports,
      support,
      contacts,
      metrics: {
        days: 30,
        quotes,
        cleaning,
        cleaningAttachment: quotes
          ? Math.round((cleaning / quotes) * 1000) / 10
          : null,
        registrations,
        events,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const actor = await requireAdminRequest(req);
  if (!actor)
    return NextResponse.json(
      { error: "Owner access and MFA required" },
      { status: 403 },
    );
  const raw = await req.text();
  if (raw.length > 16000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          "Check your entries; moderation needs a reason of at least 10 characters.",
      },
      { status: 400 },
    );
  const d = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      if (d.action === "content") {
        await tx.recruitmentSetting.upsert({
          where: { key: "public-business-content" },
          create: { key: "public-business-content", value: d.content },
          update: { value: d.content },
        });
      }
      if (d.action === "profile") {
        const mover = await tx.moverCompany.findUniqueOrThrow({
          where: { id: d.id },
          select: { yearsOperating: true },
        });
        if (d.verifyYears && mover.yearsOperating === null)
          throw Error("Operating history has not been supplied.");
        await tx.moverCompany.update({
          where: { id: d.id },
          data: {
            profileReviewedAt: new Date(),
            ...(d.verifyYears !== undefined
              ? { yearsOperatingVerifiedAt: d.verifyYears ? new Date() : null }
              : {}),
          },
        });
      }
      if (d.action === "review") {
        const review = await tx.review.update({
          where: { id: d.id },
          data: {
            moderationStatus: d.status,
            isPublic: d.status === "APPROVED",
          },
        });
        await recalculateMoverReviewAggregates(review.moverCompanyId, tx);
      }
      if (d.action === "response") {
        const review = await tx.review.findUniqueOrThrow({
          where: { id: d.id },
          select: { providerResponse: true },
        });
        if (!review.providerResponse) throw Error("No response to review.");
        await tx.review.update({
          where: { id: d.id },
          data: d.approve
            ? { responseApprovedAt: new Date() }
            : {
                providerResponse: null,
                responseSubmittedAt: null,
                responseApprovedAt: null,
              },
        });
      }
      if (d.action === "support") {
        await tx.customerRequestSupport.update({
          where: { id: d.id },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        });
      }
      if (d.action === "report") {
        await tx.reviewReport.update({
          where: { id: d.id },
          data: { status: "REVIEWED" },
        });
      }
      await tx.adminAuditLog.create({
        data: {
          actorId: actor.reviewerId,
          action: "trust_" + d.action + "_updated",
          meta: {
            ...d,
            ...(d.action === "content"
              ? { content: undefined, fields: Object.keys(d.content) }
              : {}),
          },
        },
      });
    });
    revalidatePublicMovers();
    revalidatePath("/about");
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json(
      {
        error: "The update could not be saved. Check the record and try again.",
      },
      { status: 400 },
    );
  }
}
