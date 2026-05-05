import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendContactNotification } from "@/lib/email";
import { contactSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`contact:${ip}`, 6).allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const parsed = contactSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.contactMessage.create({ data: parsed.data });
  const emailResult = await sendContactNotification(parsed.data);

  return NextResponse.json({
    ok: true,
    emailSent: emailResult.sent,
    emailConfigured: !emailResult.skipped,
  });
}
