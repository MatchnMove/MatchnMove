import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import { moverGoogleSchema } from "@/lib/validators";
import { createAdminAccount, createMoverAccount, ensureMoverCompanyProfile, establishMoverSession } from "@/lib/mover-auth";
import { revalidatePublicSite } from "@/lib/public-cache";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getDatabaseUnavailableMessage, logRuntimeWarning } from "@/lib/runtime-errors";
import { isAdminUser, isConfiguredAdminEmail } from "@/lib/admin-auth";

const googleClient = new OAuth2Client();

function buildCompanyName(name: string) {
  return `${name}'s Moving Co.`;
}

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

async function verifyGoogleCredential(credential: string, clientId: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return null;
    }

    const fallbackName = [payload.given_name, payload.family_name].filter(Boolean).join(" ").trim();

    return {
      email: payload.email.toLowerCase(),
      name: payload.name?.trim() || fallbackName || "Mover Partner",
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`mover-google:${ip}`, 10).allowed) {
    return NextResponse.json({ error: "Too many sign-in attempts. Please try again shortly." }, { status: 429 });
  }

  const clientId = getGoogleClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 503 });
  }

  try {
    const parsed = moverGoogleSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid Google sign-in request" }, { status: 400 });
    }

    const googleAccount = await verifyGoogleCredential(parsed.data.credential, clientId);
    if (!googleAccount) {
      return NextResponse.json({ error: "Google account verification failed" }, { status: 401 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: googleAccount.email },
      include: { moverCompany: true },
    });

    if (!existingUser) {
      if (isConfiguredAdminEmail(googleAccount.email)) {
        const adminUser = await createAdminAccount({
          name: googleAccount.name,
          email: googleAccount.email,
        });
        return NextResponse.json({
          ok: true,
          adminMfaRequired: isAdminUser({ ...adminUser, mfaVerified: false }),
        });
      }

      const newUser = await createMoverAccount({
        name: googleAccount.name,
        companyName: buildCompanyName(googleAccount.name),
        email: googleAccount.email,
        phone: "",
        serviceAreas: ["Auckland"]
      });

      await prisma.user.update({
        where: { id: newUser.id },
        data: { emailVerifiedAt: new Date() }
      });

      revalidatePublicSite();
      return NextResponse.json({ ok: true, onboarding: true });
    }

    let sessionUser = existingUser;
    const userUpdates: { emailVerifiedAt?: Date; name?: string } = {};
    if (!existingUser.emailVerifiedAt) userUpdates.emailVerifiedAt = new Date();
    if (!existingUser.name) userUpdates.name = googleAccount.name;

    if (Object.keys(userUpdates).length) {
      sessionUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: userUpdates,
        include: { moverCompany: true },
      });
    }

    const adminMfaRequired = isAdminUser({ ...sessionUser, mfaVerified: false });
    if (!existingUser.moverCompany && !adminMfaRequired) {
      await ensureMoverCompanyProfile({
        userId: existingUser.id,
        name: sessionUser.name || googleAccount.name,
        companyName: buildCompanyName(sessionUser.name || googleAccount.name),
        serviceAreas: ["Auckland"]
      });
      revalidatePublicSite();
    }

    await establishMoverSession(sessionUser);
    return NextResponse.json({ ok: true, adminMfaRequired });
  } catch (error) {
    logRuntimeWarning("Mover Google sign-in unavailable", error);
    return NextResponse.json({ error: getDatabaseUnavailableMessage("Mover Google sign-in") }, { status: 503 });
  }
}
