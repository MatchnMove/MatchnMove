import { AuthTokenType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { consumeAuthTokenForUser, purgeAuthTokens } from "@/lib/auth-token";
import { isAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { establishMoverSession } from "@/lib/mover-auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getDatabaseUnavailableMessage, logRuntimeWarning } from "@/lib/runtime-errors";
import { moverSignInCodeSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`mover-sign-in-code:${ip}`, 8, 15 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many code attempts. Please try again shortly." }, { status: 429 });
  }

  try {
    const parsed = moverSignInCodeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid sign-in code" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!user) {
      return NextResponse.json({ error: "That sign-in code is invalid or has expired." }, { status: 400 });
    }

    const tokenRecord = await consumeAuthTokenForUser(parsed.data.code, AuthTokenType.SIGN_IN_CODE, user.id);
    if (!tokenRecord) {
      return NextResponse.json({ error: "That sign-in code is invalid or has expired." }, { status: 400 });
    }

    await purgeAuthTokens(user.id, AuthTokenType.SIGN_IN_CODE);
    await establishMoverSession(user);

    return NextResponse.json({
      ok: true,
      adminMfaRequired: isAdminUser({ ...user, mfaVerified: false }),
    });
  } catch (error) {
    logRuntimeWarning("Mover sign-in code verification unavailable", error);
    return NextResponse.json({ error: getDatabaseUnavailableMessage("Mover sign-in code verification") }, { status: 503 });
  }
}
