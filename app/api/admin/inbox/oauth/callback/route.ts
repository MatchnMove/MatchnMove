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
import { assertAdminGmailSender, type GmailSendAs } from "@/lib/admin-email";

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
    const accountAddress = profile.data.emailAddress.trim().toLowerCase();
    try {
      const senders = await client.request<{ sendAs?: GmailSendAs[] }>({
        url: "https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs",
      });
      assertAdminGmailSender(senders.data);
    } catch (error) {
      await client.revokeCredentials().catch(() => undefined);
      throw error;
    }
    await locked(async (tx) => {
      const { checkInboxActor } = await import("@/lib/partner-inbox-access");
      await checkInboxActor(tx, actor);
      ownerOnly(actor);
      const previous = await tx.partnerMailbox.findUnique({ where: { id: "support" } });
      await tx.partnerMailbox.upsert({
        where: { id: "support" },
        create: {
          id: "support",
          address: accountAddress,
          encryptedRefreshToken: sealInboxSecret(tokens.refresh_token!),
          connectedAt: new Date(),
        },
        update: {
          address: accountAddress,
          encryptedRefreshToken: sealInboxSecret(tokens.refresh_token!),
          connectedAt: new Date(),
          lastError: null,
          failureCount: 0,
          nextAttemptAt: null,
          ...(previous?.address.toLowerCase() !== accountAddress ? {
            historyId: null, initialPageToken: null, initialHistoryId: null,
            draftPageToken: null, initialSyncComplete: false, lastSyncedAt: null,
          } : {}),
        },
      });
      await audit(tx, actor.id, "partner_inbox_connected", {
        mailbox: accountAddress,
        sender: SUPPORT_MAILBOX,
        provider: "Google Workspace",
      });
    });
    destination.searchParams.set("connected", "1");
  } catch {
    destination.searchParams.set(
      "connectionError",
      "Google connection failed. Use the contact account, or an account with contact@matchnmove.co.nz as a verified Send mail as address, and check the owner setup instructions.",
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
