import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getCustomerRequest,
  newPrivateToken,
  tokenHash,
} from "@/lib/customer-access";
import { hasSameOrigin } from "@/lib/request-origin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("support"),
    message: z.string().trim().min(10).max(2000),
  }),
  z.object({ action: z.literal("access") }),
]);
export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!rateLimit("customer-support:" + getClientIp(req), 10).allowed)
    return NextResponse.json(
      { error: "Please wait and try again." },
      { status: 429 },
    );
  const quote = await getCustomerRequest();
  if (!quote)
    return NextResponse.json(
      { error: "Private request access required" },
      { status: 401 },
    );
  const raw = await req.text();
  if (raw.length > 4096)
    return NextResponse.json({ error: "Message too large" }, { status: 413 });
  let data;
  try {
    data = schema.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  if (!data.success)
    return NextResponse.json({ error: "Check your message." }, { status: 400 });
  if (data.data.action === "support") {
    await prisma.$transaction(async (tx) => {
      const record = await tx.customerRequestSupport.create({
        data: {
          quoteRequestId: quote.id,
          message: data.data.action === "support" ? data.data.message : "",
        },
      });
      await tx.adminAuditLog.create({
        data: {
          action: "customer_request_correction_submitted",
          meta: { quoteRequestId: quote.id, supportRequestId: record.id },
        },
      });
    });
    return NextResponse.json(
      { saved: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const token = newPrivateToken();
  await prisma.customerRequestAccess.create({
    data: {
      quoteRequestId: quote.id,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    },
  });
  return NextResponse.json(
    {
      url: new URL(
        "/request/access?token=" + encodeURIComponent(token),
        process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin,
      ).toString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
