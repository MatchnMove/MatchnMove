import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { moverChangePasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(request);
  if (!rateLimit(`cleaner-password:${cleaner.userId}:${ip}`, 6).allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = moverChangePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid password details." }, { status: 400 });
  if (!(await verifyPassword(parsed.data.currentPassword, cleaner.user.passwordHash))) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  await prisma.user.update({ where: { id: cleaner.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  return NextResponse.json({ ok: true });
}
