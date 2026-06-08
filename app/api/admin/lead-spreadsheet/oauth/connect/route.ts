import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { getMicrosoftAuthorizationUrl } from "@/lib/lead-spreadsheet";

const OAUTH_STATE_COOKIE = "mm_excel_oauth_state";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!isAdminUser(session?.user) || !session.user.mfaVerified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(getMicrosoftAuthorizationUrl(state));
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    console.error("lead spreadsheet OAuth start failed", error);
    return NextResponse.redirect(new URL("/admin/leads?error=configuration", _req.url));
  }
}
