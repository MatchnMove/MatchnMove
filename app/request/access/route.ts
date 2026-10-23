import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  tokenHash,
  REQUEST_ACCESS_COOKIE,
  privateCookieOptions,
} from "@/lib/customer-access";
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    return new NextResponse("This private link is invalid or expired.", {
      status: 404,
      headers,
    });
  const record = await prisma.customerRequestAccess.findUnique({
    where: { tokenHash: tokenHash(token) },
  });
  if (!record || record.expiresAt < new Date())
    return new NextResponse("This private link is invalid or expired.", {
      status: 404,
      headers,
    });
  const response = NextResponse.redirect(new URL("/request", req.url), 303);
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  response.cookies.set(REQUEST_ACCESS_COOKIE, token, {
    ...privateCookieOptions,
    maxAge: Math.max(
      0,
      Math.floor((record.expiresAt.getTime() - Date.now()) / 1000),
    ),
  });
  return response;
}
