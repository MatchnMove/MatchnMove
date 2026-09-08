import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createCleanerAccount, sendCleanerAccountVerification } from "@/lib/cleaner-auth";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { cleanerRegisterSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`cleaner-register:${ip}`, 6).allowed) {
    return NextResponse.json({ error: "Too many sign-up attempts. Please try again shortly." }, { status: 429 });
  }

  const parsed = cleanerRegisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid registration details." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  try {
    const user = await createCleanerAccount(parsed.data);
    const verification = await sendCleanerAccountVerification(user).catch(() => ({ sent: false, queued: false }));
    return NextResponse.json({ ok: true, status: "PENDING", verificationEmailSent: verification.sent, verificationEmailQueued: verification.queued });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("cleaner registration failed", error);
    return NextResponse.json({ error: "Cleaner registration is temporarily unavailable." }, { status: 503 });
  }
}
