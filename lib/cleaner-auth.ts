import { randomBytes, randomInt } from "crypto";
import { AuthTokenType, Prisma } from "@prisma/client";
import { createSessionToken, setSessionCookie, auth } from "@/lib/auth";
import { issueAuthToken, purgeAuthTokens } from "@/lib/auth-token";
import { prisma } from "@/lib/db";
import { sendCleanerPasswordResetEmail, sendCleanerSignInCodeEmail, sendCleanerVerificationEmail } from "@/lib/email";
import { sanitiseNzServiceAreas } from "@/lib/nz-regions";
import { hashPassword } from "@/lib/password";

const authenticatedCleanerInclude = Prisma.validator<Prisma.CleanerCompanyInclude>()({
  user: true,
});

export async function establishCleanerSession(user: { id: string; email: string; role: string }) {
  const token = createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    mfaVerified: true,
  });
  await setSessionCookie(token);
}

export async function requireAuthenticatedCleaner() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLEANER") return null;

  return prisma.cleanerCompany.findFirst({
    where: {
      userId: session.user.id,
      status: { not: "DELETING" },
      user: { role: "CLEANER" },
    },
    include: authenticatedCleanerInclude,
  });
}

export async function createCleanerAccount(input: {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  password?: string;
  serviceAreas: string[];
}) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password || randomBytes(24).toString("hex"));
  const serviceAreas = sanitiseNzServiceAreas(input.serviceAreas);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        role: "CLEANER",
      },
    });

    await tx.cleanerCompany.create({
      data: {
        userId: createdUser.id,
        companyName: input.companyName.trim(),
        contactPerson: input.name.trim(),
        phone: input.phone.trim(),
        serviceAreas,
        status: "PENDING",
      },
    });

    return createdUser;
  });

  await establishCleanerSession(user);
  return user;
}

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendCleanerAccountVerification(user: { id: string; email: string; name?: string | null }) {
  await purgeAuthTokens(user.id, AuthTokenType.VERIFY_EMAIL);
  const token = await issueAuthToken(user.id, AuthTokenType.VERIFY_EMAIL, 48);
  return sendCleanerVerificationEmail({
    email: user.email,
    name: user.name,
    verificationUrl: `${getBaseUrl()}/cleaner/verify-email?token=${token}`,
  });
}

export async function sendCleanerPasswordReset(user: { id: string; email: string; name?: string | null }) {
  await purgeAuthTokens(user.id, AuthTokenType.RESET_PASSWORD);
  const token = await issueAuthToken(user.id, AuthTokenType.RESET_PASSWORD, 2);
  return sendCleanerPasswordResetEmail({
    email: user.email,
    name: user.name,
    resetUrl: `${getBaseUrl()}/cleaner/reset-password?token=${token}`,
  });
}

export async function sendCleanerSignInCode(user: { id: string; email: string; name?: string | null }) {
  await purgeAuthTokens(user.id, AuthTokenType.SIGN_IN_CODE);
  const code = randomInt(100000, 1000000).toString();
  await issueAuthToken(user.id, AuthTokenType.SIGN_IN_CODE, 0.25, code);
  return sendCleanerSignInCodeEmail({ email: user.email, name: user.name, signInCode: code });
}
