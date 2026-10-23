import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { consumeAuthToken, purgeAuthTokens } from "@/lib/auth-token";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";
import { syncRecruitmentOutcomes } from "@/lib/recruitment-outreach";

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
  const company = await prisma.moverCompany.findUnique({ where: { userId: tokenRecord.userId }, select: { id: true } });
  if (company) await syncRecruitmentOutcomes(company.id).catch(() => console.error("Recruitment registration sync deferred to scheduler"));
  revalidatePublicMovers();
  revalidateAboutPage();

  return NextResponse.json({ ok: true });
}
