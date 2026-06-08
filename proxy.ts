import { NextRequest, NextResponse } from "next/server";

function privateNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname === "/api/mover/login" ||
    pathname === "/api/mover/login/verify-code" ||
    pathname === "/api/mover/register" ||
    pathname === "/api/mover/session" ||
    pathname === "/api/mover/google" ||
    pathname === "/api/mover/forgot-password" ||
    pathname === "/api/mover/reset-password" ||
    pathname === "/api/mover/verify-email" ||
    pathname === "/api/mover/resend-verification"
  ) {
    return privateNoStore(NextResponse.next());
  }

  const token = req.cookies.get("mm_session")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return privateNoStore(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const loginUrl = new URL("/mover/login", req.url);
    loginUrl.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
    return privateNoStore(NextResponse.redirect(loginUrl));
  }

  return privateNoStore(NextResponse.next());
}

export const config = { matcher: ["/mover/dashboard/:path*", "/api/mover/:path*"] };
