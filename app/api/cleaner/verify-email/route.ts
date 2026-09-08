import { AuthTokenType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { consumeAuthTokenForRole, purgeAuthTokens } from "@/lib/auth-token";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token) return NextResponse.json({ error: "Missing verification token." }, { status: 400 });
  const record = await consumeAuthTokenForRole(body.token, AuthTokenType.VERIFY_EMAIL, "CLEANER");
  if (!record) return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
  await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  await purgeAuthTokens(record.userId, AuthTokenType.VERIFY_EMAIL);
  return NextResponse.json({ ok: true });
}
