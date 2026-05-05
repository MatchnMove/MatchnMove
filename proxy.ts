import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname === "/api/mover/login" ||
    pathname === "/api/mover/register" ||
    pathname === "/api/mover/google" ||
    pathname === "/api/mover/forgot-password" ||
    pathname === "/api/mover/reset-password" ||
    pathname === "/api/mover/verify-email" ||
    pathname === "/api/mover/resend-verification"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("mm_session")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/mover/login", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/mover/dashboard/:path*", "/api/mover/:path*"] };
