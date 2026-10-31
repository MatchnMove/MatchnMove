import { NextRequest, NextResponse } from "next/server";
import { inboxActor } from "@/lib/partner-inbox-access";
import { googleInboxClient } from "@/lib/partner-inbox-google";
import {
  openInboxSecret,
  sealInboxSecret,
  SUPPORT_MAILBOX,
} from "@/lib/partner-inbox-policy";
import { audit, locked, ownerOnly } from "@/lib/recruitment";
import { tokenHash } from "@/lib/recruitment-policy";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const destination = new URL(
    "/admin/inbox",
    process.env.NEXTAUTH_URL || req.url,
  );
  try {
    const actor = await inboxActor();
    ownerOnly(actor);
    const state = req.nextUrl.searchParams.get("state") || "";
    const code = req.nextUrl.searchParams.get("code") || "";
    if (!state || state !== req.cookies.get("mm_inbox_oauth")?.value || !code)
      throw new Error("Invalid OAuth callback");
    const pending = await prisma.partnerInboxOAuthState.findUnique({
      where: { hash: tokenHash(state) },
    });
    if (
      !pending ||
      pending.actorId !== actor.id ||
      pending.expiresAt < new Date()
    )
      throw new Error("Expired OAuth state");
    const consumed = await prisma.partnerInboxOAuthState.deleteMany({
      where: { hash: pending.hash, actorId: actor.id },
    });
    if (!consumed.count) throw new Error("OAuth state was already consumed");
    const client = await googleInboxClient();
    const { tokens } = await client.getToken({
      code,
      codeVerifier: openInboxSecret(pending.encryptedVerifier),
    });
    if (
      !tokens.refresh_token ||
      !tokens.scope
        ?.split(" ")
        .includes("https://www.googleapis.com/auth/gmail.modify")
    )
      throw new Error("Mailbox scope missing");
    client.setCredentials(tokens);
    const profile = await client.request<{ emailAddress: string }>({
      url: "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    });
    if (profile.data.emailAddress.toLowerCase() !== SUPPORT_MAILBOX) {
      await client.revokeCredentials().catch(() => undefined);
      throw new Error("Only the support mailbox can connect");
    }
    await locked(async (tx) => {
      const { checkInboxActor } = await import("@/lib/partner-inbox-access");
      await checkInboxActor(tx, actor);
      ownerOnly(actor);
      await tx.partnerMailbox.upsert({
        where: { id: "support" },
        create: {
          id: "support",
          address: SUPPORT_MAILBOX,
          encryptedRefreshToken: sealInboxSecret(tokens.refresh_token!),
          connectedAt: new Date(),
        },
        update: {
          address: SUPPORT_MAILBOX,
          encryptedRefreshToken: sealInboxSecret(tokens.refresh_token!),
          connectedAt: new Date(),
          lastError: null,
          failureCount: 0,
          nextAttemptAt: null,
        },
      });
      await audit(tx, actor.id, "partner_inbox_connected", {
        mailbox: SUPPORT_MAILBOX,
        provider: "Google Workspace",
      });
    });
    destination.searchParams.set("connected", "1");
  } catch {
    destination.searchParams.set(
      "connectionError",
      "Google connection failed. Use the support account and check the owner setup instructions.",
    );
  }
  const response = NextResponse.redirect(destination);
  response.cookies.set("mm_inbox_oauth", "", {
    path: "/api/admin/inbox/oauth",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
