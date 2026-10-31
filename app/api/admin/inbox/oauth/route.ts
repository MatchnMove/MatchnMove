import { randomBytes } from "node:crypto";
import { CodeChallengeMethod } from "google-auth-library";
import { NextResponse } from "next/server";
import { inboxActor } from "@/lib/partner-inbox-access";
import { googleInboxClient } from "@/lib/partner-inbox-google";
import { sealInboxSecret } from "@/lib/partner-inbox-policy";
import { ownerOnly } from "@/lib/recruitment";
import { tokenHash } from "@/lib/recruitment-policy";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const actor = await inboxActor();
    ownerOnly(actor);
    const client = await googleInboxClient();
    const state = randomBytes(32).toString("base64url");
    const pkce = await client.generateCodeVerifierAsync();
    await prisma.partnerInboxOAuthState.create({
      data: {
        hash: tokenHash(state),
        actorId: actor.id,
        encryptedVerifier: sealInboxSecret(pkce.codeVerifier),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    await prisma.partnerInboxOAuthState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/gmail.modify"],
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      login_hint: "support@matchnmove.co.nz",
    });
    const response = NextResponse.redirect(url);
    response.cookies.set("mm_inbox_oauth", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/admin/inbox/oauth",
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json(
      { error: "Owner access and inbox OAuth configuration are required." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
}
