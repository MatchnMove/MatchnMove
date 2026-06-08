import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { connectMicrosoftLeadSpreadsheet } from "@/lib/lead-spreadsheet";

const OAUTH_STATE_COOKIE = "mm_excel_oauth_state";

function statesMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const providerError = req.nextUrl.searchParams.get("error");

  let destination = "/admin/leads?error=connection";
  try {
    if (!isAdminUser(session?.user) || !session.user.mfaVerified) {
      destination = "/mover/login?next=/admin/leads";
    } else if (providerError) {
      destination = "/admin/leads?error=cancelled";
    } else if (!code || !state || !expectedState || !statesMatch(expectedState, state)) {
      destination = "/admin/leads?error=state";
    } else {
      await connectMicrosoftLeadSpreadsheet(code, session.user.id);
      destination = "/admin/leads?connected=1";
    }
  } catch (error) {
    console.error("lead spreadsheet OAuth callback failed", error);
  }

  const response = NextResponse.redirect(new URL(destination, req.url));
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
