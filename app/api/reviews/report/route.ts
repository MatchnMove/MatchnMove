import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-origin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!rateLimit("review-report:" + getClientIp(req), 4).allowed)
    return NextResponse.json(
      { error: "Please wait before reporting again." },
      { status: 429 },
    );
  const raw = await req.text();
  if (raw.length > 3000)
    return NextResponse.json({ error: "Report too large" }, { status: 413 });
  let parsed;
  try {
    parsed = z
      .object({
        reviewId: z.string().max(80),
        reason: z.string().trim().min(10).max(1000),
      })
      .safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }
  if (!parsed.success)
    return NextResponse.json({ error: "Check your report" }, { status: 400 });
  const review = await prisma.review.findFirst({
    where: {
      id: parsed.data.reviewId,
      isPublic: true,
      moderationStatus: "APPROVED",
    },
    select: { id: true },
  });
  if (!review)
    return NextResponse.json({ error: "Review unavailable" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    const report = await tx.reviewReport.create({ data: parsed.data });
    await tx.adminAuditLog.create({
      data: {
        action: "review_reported",
        meta: { reviewId: review.id, reportId: report.id },
      },
    });
  });
  return NextResponse.json({ received: true });
}
