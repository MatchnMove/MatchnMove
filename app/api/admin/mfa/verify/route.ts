import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { decryptAdminMfaSecret, verifyAdminMfaCode } from "@/lib/admin-mfa";
import { prisma } from "@/lib/db";
import { establishMoverSession } from "@/lib/mover-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminUser(session?.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`admin-mfa:${session.user.id}`, 8, 15 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many code attempts. Try again later." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim() || "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit authenticator code." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      adminMfaSecret: true,
      adminMfaEnabledAt: true,
    },
  });
  if (!user?.adminMfaSecret) {
    return NextResponse.json({ error: "Set up the authenticator first." }, { status: 400 });
  }

  const secret = decryptAdminMfaSecret(user.adminMfaSecret);
  if (!(await verifyAdminMfaCode(secret, code))) {
    return NextResponse.json({ error: "That authenticator code is incorrect." }, { status: 400 });
  }

  if (!user.adminMfaEnabledAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { adminMfaEnabledAt: new Date() },
    });
  }
  await establishMoverSession(user, true);

  return NextResponse.json({ ok: true });
}
