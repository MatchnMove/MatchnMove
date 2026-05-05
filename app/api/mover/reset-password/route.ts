import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { consumeAuthToken, purgeAuthTokens } from "@/lib/auth-token";
import { hashPassword } from "@/lib/password";
import { moverResetPasswordSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`mover-reset-password:${ip}`, 8).allowed) {
    return NextResponse.json({ error: "Too many password reset attempts. Please try again shortly." }, { status: 429 });
  }

  const parsed = moverResetPasswordSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid reset details" }, { status: 400 });
  }

  const tokenRecord = await consumeAuthToken(parsed.data.token, AuthTokenType.RESET_PASSWORD);
  if (!tokenRecord) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: { passwordHash }
  });
  await purgeAuthTokens(tokenRecord.userId, AuthTokenType.RESET_PASSWORD);

  return NextResponse.json({ ok: true });
}
