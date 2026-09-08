import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendCleanerSignInCode } from "@/lib/cleaner-auth";
import { hashPassword, needsPasswordRehash, verifyPassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { cleanerLoginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`cleaner-login:${ip}`, 8).allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please try again shortly." }, { status: 429 });
  }

  const parsed = cleanerLoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid login details." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { cleanerCompany: { select: { status: true } } },
  });
  if (!user || user.role !== "CLEANER" || !user.cleanerCompany || user.cleanerCompany.status === "DELETING") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!validPassword) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  if (needsPasswordRehash(user.passwordHash)) {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  }

  const result = await sendCleanerSignInCode(user);
  if (!result.sent) return NextResponse.json({ error: "We could not send your sign-in code. Please try again shortly." }, { status: 503 });
  return NextResponse.json({ ok: true, emailCodeRequired: true, email: user.email });
}
