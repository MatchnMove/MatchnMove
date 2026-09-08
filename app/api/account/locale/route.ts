import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSupportedLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false }, { headers: noStoreHeaders });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredLocale: true },
  });

  return NextResponse.json({
    authenticated: Boolean(user),
    locale: isSupportedLocale(user?.preferredLocale) ? user.preferredLocale : "en-NZ",
  }, { headers: noStoreHeaders });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { locale?: string } | null;
  if (!isSupportedLocale(body?.locale)) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400, headers: noStoreHeaders });
  }

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.updateMany({
      where: { id: session.user.id },
      data: { preferredLocale: body.locale },
    });
  }

  const response = NextResponse.json({ ok: true, authenticated: Boolean(session?.user?.id) }, { headers: noStoreHeaders });
  response.cookies.set(LOCALE_COOKIE, body.locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
