import { cookies } from "next/headers";
import { createHmac } from "crypto";

type SessionPayload = { userId: string; email: string; role: string; exp: number };

const SESSION_COOKIE = "mm_session";

function sign(payload: string) {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET || "dev-secret").update(payload).digest("hex");
}

export function createSessionToken(data: Omit<SessionPayload, "exp">) {
  const payload: SessionPayload = { ...data, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function parseSessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || sign(payload) !== sig) return null;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionPayload;
  if (parsed.exp < Date.now()) return null;
  return parsed;
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export function auth() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = parseSessionToken(token);
  if (!session) return null;
  return { user: { id: session.userId, email: session.email, role: session.role } };
}
