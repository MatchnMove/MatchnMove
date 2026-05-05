import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = createSessionToken({ userId: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
