import { NextRequest, NextResponse } from "next/server";
import { parseSessionToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("mm_session")?.value;
  const session = parseSessionToken(token);
  if (!session) return NextResponse.redirect(new URL("/mover/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/mover/dashboard/:path*", "/api/mover/:path*"] };
