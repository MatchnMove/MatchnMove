import { AuthTokenType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { consumeAuthTokenForUser, purgeAuthTokens } from "@/lib/auth-token";
import { establishCleanerSession } from "@/lib/cleaner-auth";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { cleanerSignInCodeSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`cleaner-sign-in-code:${ip}`, 8, 15 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many code attempts. Please try again shortly." }, { status: 429 });
  }

  const parsed = cleanerSignInCodeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid sign-in code." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.role !== "CLEANER") {
    return NextResponse.json({ error: "That sign-in code is invalid or has expired." }, { status: 400 });
  }

  const token = await consumeAuthTokenForUser(parsed.data.code, AuthTokenType.SIGN_IN_CODE, user.id);
  if (!token) return NextResponse.json({ error: "That sign-in code is invalid or has expired." }, { status: 400 });
  await purgeAuthTokens(user.id, AuthTokenType.SIGN_IN_CODE);
  await establishCleanerSession(user);
  return NextResponse.json({ ok: true });
}
