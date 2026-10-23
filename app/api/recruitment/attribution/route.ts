import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tokenHash } from "@/lib/recruitment-policy";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const response = NextResponse.redirect(
    new URL("/mover/login?mode=signup", req.url),
  );
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) return response;
  const message = await prisma.outreachMessage.findUnique({
    where: { attributionHash: tokenHash(token) },
    select: {
      status: true,
      attributionExpiresAt: true,
      attributionConsumedAt: true,
    },
  });
  if (
    message?.status === "SENT" &&
    !message.attributionConsumedAt &&
    message.attributionExpiresAt > new Date()
  ) {
    response.cookies.set("mm_recruitment", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 86400,
    });
  }
  return response;
}
