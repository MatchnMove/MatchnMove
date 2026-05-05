import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { moverResendVerificationSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/mover-auth";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`mover-resend-verification:${ip}`, 5).allowed) {
    return NextResponse.json({ error: "Too many verification requests. Please try again shortly." }, { status: 429 });
  }

  const parsed = moverResendVerificationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid email address" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, name: true, emailVerifiedAt: true }
  });

  if (user && !user.emailVerifiedAt) {
    await sendVerificationEmail(user);
  }

  return NextResponse.json({
    ok: true,
    message: "If that account needs verification, a fresh email has been sent."
  });
}
