import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  hashPhoneVerificationCode,
  normalizeNzPhoneNumber,
  phoneVerificationCodeMatches,
} from "@/lib/phone-verification";
import { requireAuthenticatedMover } from "@/lib/mover-profile";
import { phoneVerificationCodeSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mover.phone) return NextResponse.json({ error: "Save a phone number first." }, { status: 400 });

  const parsed = phoneVerificationCodeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid code." }, { status: 400 });
  }

  const phone = normalizeNzPhoneNumber(mover.phone);
  const record = await prisma.phoneVerificationCode.findFirst({
    where: {
      moverCompanyId: mover.id,
      phone,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return NextResponse.json({ error: "That code has expired. Request a new SMS." }, { status: 400 });
  }

  const submittedHash = hashPhoneVerificationCode(mover.id, phone, parsed.data.code);
  if (!phoneVerificationCodeMatches(record.codeHash, submittedHash)) {
    await prisma.phoneVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "That verification code is incorrect." }, { status: 400 });
  }

  const verifiedAt = new Date();
  await prisma.$transaction([
    prisma.phoneVerificationCode.update({
      where: { id: record.id },
      data: { consumedAt: verifiedAt },
    }),
    prisma.moverCompany.update({
      where: { id: mover.id },
      data: { phoneVerifiedAt: verifiedAt },
    }),
    prisma.verificationAudit.create({
      data: {
        moverCompanyId: mover.id,
        actorId: mover.userId,
        actorType: "MOVER",
        action: "PHONE_VERIFIED",
        nextStatus: "VERIFIED",
        meta: { phone },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, phoneVerifiedAt: verifiedAt.toISOString() });
}
