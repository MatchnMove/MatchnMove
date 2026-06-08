import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { moverLoginSchema } from "@/lib/validators";
import { sendSignInCodeEmail } from "@/lib/mover-auth";
import { hashPassword, needsPasswordRehash, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { getDatabaseUnavailableMessage, logRuntimeWarning } from "@/lib/runtime-errors";
import { isAdminUser } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`mover-login:${ip}`, 8).allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please try again shortly." }, { status: 429 });
  }

  try {
    const parsed = moverLoginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid login details" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    if (needsPasswordRehash(user.passwordHash)) {
      const passwordHash = await hashPassword(parsed.data.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }

    const signInCodeResult = await sendSignInCodeEmail(user);
    if (!signInCodeResult.sent) {
      logRuntimeWarning("Mover sign-in code email unavailable", signInCodeResult.error);
      return NextResponse.json({ error: "We could not send your sign-in code. Please try again shortly." }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      emailCodeRequired: true,
      email: user.email,
      adminMfaRequired: isAdminUser({ ...user, mfaVerified: false }),
    });
  } catch (error) {
    logRuntimeWarning("Mover login unavailable", error);
    return NextResponse.json({ error: getDatabaseUnavailableMessage("Mover login") }, { status: 503 });
  }
}
