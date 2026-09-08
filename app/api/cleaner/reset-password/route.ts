import { AuthTokenType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { consumeAuthTokenForRole, purgeAuthTokens } from "@/lib/auth-token";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { moverResetPasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`cleaner-reset-password:${ip}`, 8).allowed) return NextResponse.json({ error: "Too many reset attempts." }, { status: 429 });
  const parsed = moverResetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid reset details." }, { status: 400 });
  const record = await consumeAuthTokenForRole(parsed.data.token, AuthTokenType.RESET_PASSWORD, "CLEANER");
  if (!record) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await purgeAuthTokens(record.userId, AuthTokenType.RESET_PASSWORD);
  return NextResponse.json({ ok: true });
}
