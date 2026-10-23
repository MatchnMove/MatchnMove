import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuthenticatedMover } from "@/lib/mover-profile";
import { hasSameOrigin } from "@/lib/request-origin";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePublicMovers } from "@/lib/public-cache";
export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const mover = await requireAuthenticatedMover();
  if (!mover || mover.status !== "ACTIVE" || !mover.user.emailVerifiedAt)
    return NextResponse.json(
      { error: "An active, email-confirmed mover account is required." },
      { status: 401 },
    );
  if (!rateLimit("review-response:" + mover.id, 10).allowed)
    return NextResponse.json({ error: "Please wait." }, { status: 429 });
  const raw = await req.text();
  if (raw.length > 5000)
    return NextResponse.json({ error: "Response too large" }, { status: 413 });
  let parsed;
  try {
    parsed = z
      .object({
        reviewId: z.string().max(80),
        response: z.string().trim().min(10).max(1500),
      })
      .safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid response" }, { status: 400 });
  }
  if (!parsed.success)
    return NextResponse.json(
      { error: "Write 10 to 1,500 characters." },
      { status: 400 },
    );
  const review = await prisma.review.findFirst({
    where: { id: parsed.data.reviewId, moverCompanyId: mover.id },
    select: { id: true },
  });
  if (!review)
    return NextResponse.json({ error: "Review unavailable" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: review.id },
      data: {
        providerResponse: parsed.data.response,
        responseSubmittedAt: new Date(),
        responseApprovedAt: null,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        actorId: mover.userId,
        action: "review_response_submitted",
        meta: { reviewId: review.id },
      },
    });
  });
  revalidatePublicMovers();
  return NextResponse.json({ saved: true });
}
