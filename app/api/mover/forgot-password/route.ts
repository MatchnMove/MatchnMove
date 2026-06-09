import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { moverForgotPasswordSchema } from "@/lib/validators";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/mover-auth";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`mover-forgot-password:${ip}`, 5).allowed) {
    return NextResponse.json({ error: "Too many reset requests. Please try again shortly." }, { status: 429 });
  }

  const parsed = moverForgotPasswordSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid email address" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, name: true }
  });

  if (user) {
    try {
      await sendPasswordResetEmail(user);
    } catch (error) {
      console.error("Could not queue password reset email", error);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link has been sent."
  });
}
