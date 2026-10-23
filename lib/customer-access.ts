import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
export const REQUEST_ACCESS_COOKIE = "mm_request_access";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newPrivateToken = () => randomBytes(32).toString("base64url");
export const privateCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
export async function setRequestAccess(token: string) {
  (await cookies()).set(REQUEST_ACCESS_COOKIE, token, {
    ...privateCookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}
export async function getCustomerRequest() {
  const token = (await cookies()).get(REQUEST_ACCESS_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const access = await prisma.customerRequestAccess.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: {
      quoteRequest: {
        include: {
          cleaningRequest: {
            include: {
              leads: {
                select: {
                  id: true,
                  status: true,
                  purchase: { select: { id: true } },
                },
              },
            },
          },
          leads: { select: { id: true, status: true, purchasedAt: true } },
          supportRequests: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      },
    },
  });
  return access && access.expiresAt > new Date() ? access.quoteRequest : null;
}
export function requestReference(id: string) {
  return "MN-" + id.toUpperCase();
}
