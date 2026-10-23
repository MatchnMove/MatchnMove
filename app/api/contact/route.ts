import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendContactNotification } from "@/lib/email";
import { contactSchema } from "@/lib/validators";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`contact:${ip}`, 6).allowed)
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 16 * 1024) {
    return NextResponse.json(
      { error: "Contact message is too large." },
      { status: 413 },
    );
  }

  const raw = await req.text();
  if (raw.length > 16 * 1024)
    return NextResponse.json(
      { error: "Contact message is too large." },
      { status: 413 },
    );
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );

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
    if (messageSaved)
      return NextResponse.json({
        ok: true,
        messageSaved: true,
        emailSent: false,
      });
    return NextResponse.json(
      { error: "Could not receive your message. Please try again." },
      { status: 503 },
    );
  }

  if (!messageSaved && !emailResult.sent && !emailResult.queued)
    return NextResponse.json(
      { error: "Could not receive your message. Please try again." },
      { status: 503 },
    );
  return NextResponse.json({
    ok: true,
    messageSaved,
    emailSent: emailResult.sent,
    emailConfigured: !emailResult.skipped,
  });
}
