import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { moverRegisterSchema } from "@/lib/validators";
import { createMoverAccount, sendVerificationEmail } from "@/lib/mover-auth";
import { revalidatePublicSite } from "@/lib/public-cache";
import { rateLimit } from "@/lib/rate-limit";
import { getDatabaseUnavailableMessage, logRuntimeWarning } from "@/lib/runtime-errors";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`mover-register:${ip}`, 6).allowed) {
    return NextResponse.json({ error: "Too many sign-up attempts. Please try again shortly." }, { status: 429 });
  }

  try {
    const parsed = moverRegisterSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid sign up details" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const user = await createMoverAccount({
      name: parsed.data.name,
      companyName: parsed.data.companyName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      serviceAreas: parsed.data.serviceAreas
    });

    let verificationResult: Awaited<ReturnType<typeof sendVerificationEmail>> = {
      sent: false,
      skipped: false,
      queued: false,
      error: "Verification email was not attempted.",
    };
    try {
      verificationResult = await sendVerificationEmail(user);
    } catch (error) {
      logRuntimeWarning("Could not queue verification email", error);
    }
    revalidatePublicSite();

    return NextResponse.json({
      ok: true,
      needsEmailVerification: true,
      verificationEmailSent: verificationResult.sent,
      verificationEmailQueued: verificationResult.queued,
    });
  } catch (error) {
    logRuntimeWarning("Mover registration unavailable", error);
    return NextResponse.json({ error: getDatabaseUnavailableMessage("Mover registration") }, { status: 503 });
  }
}
