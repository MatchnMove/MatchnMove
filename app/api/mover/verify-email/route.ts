import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { consumeAuthToken, purgeAuthTokens } from "@/lib/auth-token";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  if (!body.token) {
    return NextResponse.json({ error: "Missing verification token" }, { status: 400 });
  }

  const tokenRecord = await consumeAuthToken(body.token, AuthTokenType.VERIFY_EMAIL);
  if (!tokenRecord) {
    return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: { emailVerifiedAt: new Date() }
  });
  await purgeAuthTokens(tokenRecord.userId, AuthTokenType.VERIFY_EMAIL);

  return NextResponse.json({ ok: true });
}
