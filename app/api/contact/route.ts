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

  let messageSaved = true;
  try {
    await prisma.contactMessage.create({ data: parsed.data });
  } catch (error) {
    messageSaved = false;
    console.error("Could not save contact message", error);
  }

  let emailResult: Awaited<ReturnType<typeof sendContactNotification>>;
  try {
    emailResult = await sendContactNotification(parsed.data);
  } catch (error) {
    console.error("Could not send contact notification", error);
    return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    messageSaved,
    emailSent: emailResult.sent,
    emailConfigured: !emailResult.skipped,
  });
}
