import { NextRequest, NextResponse } from "next/server";
import { sendCleanerPasswordReset } from "@/lib/cleaner-auth";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { moverForgotPasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`cleaner-forgot-password:${ip}`, 5).allowed) return NextResponse.json({ error: "Too many reset requests." }, { status: 429 });
  const parsed = moverForgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const user = await prisma.user.findFirst({ where: { email: parsed.data.email, role: "CLEANER" }, select: { id: true, email: true, name: true } });
  if (user) await sendCleanerPasswordReset(user).catch((error) => console.error("cleaner reset email failed", error));
  return NextResponse.json({ ok: true, message: "If a cleaner account exists for that email, a reset link has been sent." });
}
