import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { moverGoogleSchema } from "@/lib/validators";
import { createMoverAccount, ensureMoverCompanyProfile, establishMoverSession } from "@/lib/mover-auth";
import { rateLimit } from "@/lib/rate-limit";

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  sub?: string;
};

function buildCompanyName(name: string) {
  return `${name}'s Moving Co.`;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`mover-google:${ip}`, 10).allowed) {
    return NextResponse.json({ error: "Too many sign-in attempts. Please try again shortly." }, { status: 429 });
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 503 });
  }

  const parsed = moverGoogleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid Google sign-in request" }, { status: 400 });
  }

  const verification = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(parsed.data.credential)}`,
    { cache: "no-store" }
  );

  if (!verification.ok) {
    return NextResponse.json({ error: "Google could not verify this sign-in attempt" }, { status: 401 });
  }

  const tokenInfo = (await verification.json()) as GoogleTokenInfo;
  if (tokenInfo.aud !== clientId || tokenInfo.email_verified !== "true" || !tokenInfo.email) {
    return NextResponse.json({ error: "Google account verification failed" }, { status: 401 });
  }

  const email = tokenInfo.email.toLowerCase();
  const name = tokenInfo.name?.trim() || [tokenInfo.given_name, tokenInfo.family_name].filter(Boolean).join(" ").trim() || "Mover Partner";

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    const newUser = await createMoverAccount({
      name,
      companyName: buildCompanyName(name),
      email,
      phone: "",
      serviceAreas: ["Auckland"]
    });

    await prisma.user.update({
      where: { id: newUser.id },
      data: { emailVerifiedAt: new Date() }
    });

    return NextResponse.json({ ok: true, onboarding: true });
  }

  if (!existingUser.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { emailVerifiedAt: new Date() }
    });
  }

  await ensureMoverCompanyProfile({
    userId: existingUser.id,
    name: existingUser.name || name,
    companyName: existingUser.name ? buildCompanyName(existingUser.name) : buildCompanyName(name),
    serviceAreas: ["Auckland"]
  });

  await establishMoverSession(existingUser);
  return NextResponse.json({ ok: true });
}
