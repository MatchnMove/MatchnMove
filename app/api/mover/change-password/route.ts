import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuthenticatedMover } from "@/lib/mover-profile";
import { hashPassword, verifyPassword } from "@/lib/password";
import { moverChangePasswordSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { purgeAuthTokens } from "@/lib/auth-token";

export async function POST(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`mover-change-password:${mover.id}`, 10, 60_000).allowed) {
    return NextResponse.json({ error: "Too many password change attempts. Please try again shortly." }, { status: 429 });
  }

  const parsed = moverChangePasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid password details" }, { status: 400 });
  }

  const { currentPassword, password } = parsed.data;
  const passwordMatches = await verifyPassword(currentPassword, mover.user.passwordHash);

  if (!passwordMatches) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  }

  const isSamePassword = await verifyPassword(password, mover.user.passwordHash);
  if (isSamePassword) {
    return NextResponse.json({ error: "Choose a new password that is different from your current password." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: mover.userId },
    data: { passwordHash },
  });

  await purgeAuthTokens(mover.userId, AuthTokenType.RESET_PASSWORD);

  return NextResponse.json({ ok: true, message: "Password updated successfully." });
}
