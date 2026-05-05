import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("mm_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/mover/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/mover/dashboard/:path*", "/api/mover/:path*"] };
