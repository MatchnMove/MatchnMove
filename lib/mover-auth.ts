import { randomBytes } from "crypto";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { issueAuthToken, purgeAuthTokens } from "@/lib/auth-token";
import { sendMoverPasswordResetEmail, sendMoverVerificationEmail } from "@/lib/email";
import { sanitiseNzServiceAreas } from "@/lib/nz-regions";
import { hashPassword } from "@/lib/password";

type MoverAccountInput = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  password?: string;
  serviceAreas: string[];
};

function normalizeServiceAreas(serviceAreas: string[]) {
  return sanitiseNzServiceAreas(serviceAreas);
}

export async function establishMoverSession(user: { id: string; email: string; role: string }) {
  const token = createSessionToken({ userId: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);
}

export async function createMoverAccount(input: MoverAccountInput) {
  const passwordToHash = input.password || randomBytes(24).toString("hex");
  const passwordHash = await hashPassword(passwordToHash);
  const email = input.email.trim().toLowerCase();
  const serviceAreas = normalizeServiceAreas(input.serviceAreas);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash
      }
    });

    await tx.moverCompany.create({
      data: {
        userId: createdUser.id,
        companyName: input.companyName.trim(),
        contactPerson: input.name.trim(),
        phone: input.phone.trim(),
        serviceAreas
      }
    });

    return createdUser;
  });

  await establishMoverSession(user);
  return user;
}

export async function ensureMoverCompanyProfile(params: {
  userId: string;
  name: string | null;
  companyName: string;
  phone?: string | null;
  serviceAreas?: string[];
}) {
  const serviceAreas = normalizeServiceAreas(params.serviceAreas || ["Auckland"]);

  return prisma.moverCompany.upsert({
    where: { userId: params.userId },
    update: {
      companyName: params.companyName.trim(),
      contactPerson: params.name?.trim() || params.companyName.trim(),
      phone: params.phone?.trim() || undefined,
      serviceAreas
    },
    create: {
      userId: params.userId,
      companyName: params.companyName.trim(),
      contactPerson: params.name?.trim() || params.companyName.trim(),
      phone: params.phone?.trim() || undefined,
      serviceAreas
    }
  });
}

function getBaseUrl() {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export async function sendVerificationEmail(user: { id: string; email: string; name?: string | null }) {
  await purgeAuthTokens(user.id, AuthTokenType.VERIFY_EMAIL);
  const token = await issueAuthToken(user.id, AuthTokenType.VERIFY_EMAIL, 48);
  const verificationUrl = `${getBaseUrl()}/mover/verify-email?token=${token}`;
  return sendMoverVerificationEmail({ email: user.email, name: user.name, verificationUrl });
}

export async function sendPasswordResetEmail(user: { id: string; email: string; name?: string | null }) {
  await purgeAuthTokens(user.id, AuthTokenType.RESET_PASSWORD);
  const token = await issueAuthToken(user.id, AuthTokenType.RESET_PASSWORD, 2);
  const resetUrl = `${getBaseUrl()}/mover/reset-password?token=${token}`;
  return sendMoverPasswordResetEmail({ email: user.email, name: user.name, resetUrl });
}
