import { createHash, randomBytes } from "crypto";
import { AuthTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAuthToken(userId: string, type: AuthTokenType, expiresInHours: number, token = randomBytes(32).toString("hex")) {
  const tokenHash = hashToken(token);

  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    }
  });

  return token;
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  return consumeAuthTokenForUser(token, type);
}

export async function consumeAuthTokenForUser(token: string, type: AuthTokenType, userId?: string) {
  const tokenHash = hashToken(token);
  const existing = await prisma.authToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!existing || existing.type !== type || existing.consumedAt || existing.expiresAt < new Date() || (userId && existing.userId !== userId)) {
    return null;
  }

  await prisma.authToken.update({
    where: { id: existing.id },
    data: { consumedAt: new Date() }
  });

  return existing;
}

export async function purgeAuthTokens(userId: string, type: AuthTokenType) {
  await prisma.authToken.deleteMany({
    where: {
      userId,
      type,
      consumedAt: null
    }
  });
}
