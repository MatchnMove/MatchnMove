import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createPhoneVerificationCode,
  hashPhoneVerificationCode,
  normalizeNzPhoneNumber,
} from "@/lib/phone-verification";
import { rateLimit } from "@/lib/rate-limit";
import { requireAuthenticatedMover } from "@/lib/mover-profile";
import { sendPhoneVerificationSms } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mover.phone) return NextResponse.json({ error: "Save a phone number first." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`phone-verification:${mover.id}:${ip}`, 4, 60 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many SMS requests. Try again later." }, { status: 429 });
  }

  const phone = normalizeNzPhoneNumber(mover.phone);
  if (!/^\+\d{8,15}$/.test(phone)) {
    return NextResponse.json({ error: "Save a valid phone number including the area or mobile prefix." }, { status: 400 });
  }

  const code = createPhoneVerificationCode();
  const codeHash = hashPhoneVerificationCode(mover.id, phone, code);
  const expiresAt = new Date(Date.now() + 10 * 60_000);

  await prisma.phoneVerificationCode.create({
    data: {
      userId: mover.userId,
      moverCompanyId: mover.id,
      phone,
      codeHash,
      expiresAt,
    },
  });

  try {
    const result = await sendPhoneVerificationSms(phone, code);
    return NextResponse.json({
      ok: true,
      expiresAt: expiresAt.toISOString(),
      ...(process.env.NODE_ENV !== "production" && result.developmentCode
        ? { developmentCode: result.developmentCode }
        : {}),
    });
  } catch (error) {
    await prisma.phoneVerificationCode.deleteMany({ where: { moverCompanyId: mover.id, codeHash } });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send the verification SMS." },
      { status: 503 },
    );
  }
}
