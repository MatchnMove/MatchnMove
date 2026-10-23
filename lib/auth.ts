import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

type SessionPayload = { userId: string; email: string; role: string; mfaVerified: boolean; sessionVersion?: number; exp: number };

const SESSION_COOKIE = "mm_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function sign(payload: string) {
  if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) throw new Error("NEXTAUTH_SECRET is required");
  return createHmac("sha256", process.env.NEXTAUTH_SECRET || "dev-secret").update(payload).digest("hex");
}

export function createSessionToken(data: Omit<SessionPayload, "exp">) {
  const payload: SessionPayload = { ...data, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function parseSessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(sig);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionPayload;
    if (!parsed.userId || !Number.isFinite(parsed.exp) || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function auth() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = parseSessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: {
    id: true, email: true, role: true, adminRole: true, adminDisabledAt: true, sessionVersion: true,
    canSendRecruitment: true, canViewRecruitmentLeads: true, name: true,
  } });
  if (!user || user.adminDisabledAt || user.sessionVersion !== (session.sessionVersion ?? 0)) return null;
  return { user: { ...user, mfaVerified: session.mfaVerified } };
}
