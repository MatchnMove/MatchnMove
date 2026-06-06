import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { auth } from "@/lib/auth";

type AdminContext = {
  reviewerId: string;
};

type AdminUser = {
  id: string;
  email: string;
  role: string;
  mfaVerified?: boolean;
};

function getConfiguredAdminEmails() {
  return new Set(
    (process.env.MOVER_ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminUser(user: AdminUser | null | undefined): user is AdminUser {
  if (!user) return false;
  return user.role === "ADMIN" || getConfiguredAdminEmails().has(user.email.trim().toLowerCase());
}

function extractBearerToken(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim() || req.headers.get("x-admin-token")?.trim() || null;
}

function adminTokensMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function requireAdminRequest(req: NextRequest): Promise<AdminContext | null> {
  const session = await auth();
  if (isAdminUser(session?.user) && session.user.mfaVerified) {
    return { reviewerId: session.user.id };
  }

  const configuredToken = process.env.MOVER_VERIFICATION_ADMIN_TOKEN;
  const requestToken = extractBearerToken(req);
  if (configuredToken && requestToken && adminTokensMatch(configuredToken, requestToken)) {
    return { reviewerId: "admin-token" };
  }

  return null;
}
