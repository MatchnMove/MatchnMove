import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { locked, suppressContact } from "@/lib/recruitment";
import { normalizeEmail } from "@/lib/recruitment-policy";

// Provider adapters must verify the provider's native signature, then relay this signed contract.
export async function POST(req: NextRequest) {
  const secret = process.env.RECRUITMENT_WEBHOOK_SECRET;
  const timestamp = req.headers.get("x-recruitment-timestamp") || "";
  const signature = req.headers.get("x-recruitment-signature") || "";
  if (!secret || secret.length < 32)
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  if (
    !/^\d{10,13}$/.test(timestamp) ||
    Math.abs(Date.now() - Number(timestamp)) > 300000 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const text = await req.text();
  if (text.length > 10000)
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${text}`)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  try {
    const input = z
      .object({
        eventId: z.string().min(1).max(200),
        email: z.string().email().transform(normalizeEmail),
        type: z.enum(["HARD_BOUNCE", "COMPLAINT", "UNSUBSCRIBE"]),
      })
      .parse(JSON.parse(text));
    await locked(async (tx) => {
      if (
        await tx.recruitmentProviderEvent.findUnique({
          where: { id: input.eventId },
        })
      )
        return;
      await tx.recruitmentProviderEvent.create({
        data: { id: input.eventId, type: input.type, email: input.email },
      });
      await suppressContact(tx, input.email, input.type, "provider-webhook");
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Event could not be processed" },
      { status: 400 },
    );
  }
}
