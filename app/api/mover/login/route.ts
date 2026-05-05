import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { moverLoginSchema } from "@/lib/validators";
import { establishMoverSession } from "@/lib/mover-auth";
import { hashPassword, needsPasswordRehash, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`mover-login:${ip}`, 8).allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please try again shortly." }, { status: 429 });
  }

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

  await establishMoverSession(user);
  return NextResponse.json({ ok: true });
}
