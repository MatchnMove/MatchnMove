import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import { openInboxSecret, SUPPORT_MAILBOX } from "@/lib/partner-inbox-policy";

export class InboxProviderError extends Error {
  constructor(public status: number) {
    super(`Mailbox provider request failed (${status}).`);
  }
}
export async function googleInboxClient() {
  const mailbox = await prisma.partnerMailbox.findUnique({
    where: { id: "support" },
    select: { encryptedClientConfig: true },
  });
  const stored = mailbox?.encryptedClientConfig
    ? (JSON.parse(openInboxSecret(mailbox.encryptedClientConfig)) as {
        clientId: string;
        clientSecret: string;
      })
    : null;
  const id = stored?.clientId || process.env.PARTNER_INBOX_GOOGLE_CLIENT_ID;
  const secret =
    stored?.clientSecret || process.env.PARTNER_INBOX_GOOGLE_CLIENT_SECRET;
  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (
    !id ||
    !secret ||
    !origin ||
    (process.env.NODE_ENV === "production" && !origin.startsWith("https://"))
  )
    throw new Error(
      "Configure the partner inbox Google OAuth client and public HTTPS URL.",
    );
  return new OAuth2Client(
    id,
    secret,
    `${origin}/api/admin/inbox/oauth/callback`,
  );
}
export async function inboxOAuthConfigured() {
  const row = await prisma.partnerMailbox.findUnique({
    where: { id: "support" },
    select: { encryptedClientConfig: true },
  });
  return Boolean(
    (row?.encryptedClientConfig ||
      (process.env.PARTNER_INBOX_GOOGLE_CLIENT_ID &&
        process.env.PARTNER_INBOX_GOOGLE_CLIENT_SECRET)) &&
      /^[a-f\d]{64}$/i.test(process.env.PARTNER_INBOX_ENCRYPTION_KEY || ""),
  );
}
export async function gmailConnection() {
  const mailbox = await prisma.partnerMailbox.findUnique({
    where: { id: "support" },
  });
  if (!mailbox?.encryptedRefreshToken || mailbox.address !== SUPPORT_MAILBOX)
    throw new Error("The support mailbox must be connected by an owner.");
  const client = await googleInboxClient();
  client.setCredentials({
    refresh_token: openInboxSecret(mailbox.encryptedRefreshToken),
  });
  return {
    mailbox,
    async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
      if (!path.startsWith("/") || path.startsWith("//"))
        throw new Error("Invalid provider path.");
      const token = await client.getAccessToken();
      if (!token.token) throw new InboxProviderError(401);
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me${path}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token.token}`,
            "Content-Type": "application/json",
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(30000),
          redirect: "error",
        },
      );
      if (!response.ok) throw new InboxProviderError(response.status);
      return response.status === 204
        ? ({} as T)
        : (response.json() as Promise<T>);
    },
  };
}
