import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  gmailConnection,
  InboxProviderError,
} from "@/lib/partner-inbox-google";
import {
  addresses,
  decodeEmailHeader,
  flattenParts,
  extractGmailContent,
  header,
  messageIds,
  SUPPORT_MAILBOX,
  type GmailMessage,
} from "@/lib/partner-inbox-policy";
import { locked, type Tx } from "@/lib/recruitment";
import { Prisma } from "@prisma/client";

async function matchCompany(tx: Tx, email: string) {
  const verified = await tx.partnerContactAssociation.findUnique({
    where: { email },
    include: { prospect: true },
  });
  if (verified)
    return {
      prospectId: verified.prospectId,
      moverCompanyId:
        verified.moverCompanyId || verified.prospect?.moverCompanyId || null,
      assignedAdminId: verified.prospect?.assignedAdminId || null,
    };
  const prospect = await tx.moverProspect.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  const mover = await tx.moverCompany.findFirst({
    where: { user: { email: { equals: email, mode: "insensitive" } } },
    select: { id: true, companyName: true },
  });
  if (prospect && mover && prospect.moverCompanyId !== mover.id) return {};
  return {
    prospectId: prospect?.id || null,
    moverCompanyId: mover?.id || prospect?.moverCompanyId || null,
    assignedAdminId: prospect?.assignedAdminId || null,
  };
}

export async function persistGmailMessage(
  message: GmailMessage,
  gmailDraftId?: string,
) {
  const content = extractGmailContent(message);
  const from =
    addresses(header(message.payload, "from"))[0] || "unknown@invalid.local";
  const direction = message.labelIds?.some((label) =>
    ["SENT", "DRAFT"].includes(label),
  )
    ? "OUTBOUND"
    : "INBOUND";
  const to = addresses(header(message.payload, "to"));
  const cc = addresses(header(message.payload, "cc"));
  const bcc = addresses(header(message.payload, "bcc"));
  const subject =
    decodeEmailHeader(header(message.payload, "subject")).slice(0, 500) ||
    "(No subject)";
  const stamp = Number(message.internalDate);
  const receivedAt =
    Number.isFinite(stamp) && stamp > 0 ? new Date(stamp) : new Date();
  const rfc = messageIds(header(message.payload, "message-id"))[0] || null;
  return locked(async (tx) => {
    const linked = await tx.partnerMessage.findFirst({
      where: {
        OR: [
          { gmailMessageId: message.id },
          ...(gmailDraftId ? [{ gmailDraftId }] : []),
          ...(rfc && direction === "OUTBOUND" && from === SUPPORT_MAILBOX
            ? [
                {
                  rfcMessageId: rfc,
                  direction: "OUTBOUND",
                  OR: [
                    { status: { in: ["DRAFT", "SENDING", "NEEDS_REVIEW"] } },
                    { status: "SENT", gmailMessageId: null },
                  ],
                },
              ]
            : []),
        ],
      },
    });
    if (
      linked &&
      message.labelIds?.includes("DRAFT") &&
      (linked.authorId ||
        linked.draftDirty ||
        linked.status === "SENDING" ||
        linked.status === "SENT")
    ) {
      if (gmailDraftId && linked.status === "DRAFT")
        return tx.partnerMessage.update({
          where: { id: linked.id },
          data: {
            gmailDraftId,
            gmailMessageId: message.id,
            draftMirrorUncertain: false,
          },
        });
      return linked;
    }
    let conversation = linked
      ? await tx.partnerConversation.findUniqueOrThrow({
          where: { id: linked.conversationId },
        })
      : await tx.partnerConversation.findUnique({
          where: { gmailThreadId: message.threadId },
        });
    if (!conversation && direction === "INBOUND") {
      const references = messageIds(
        `${header(message.payload, "in-reply-to")} ${header(message.payload, "references")}`,
      );
      const candidates = references.length
        ? await tx.partnerMessage.findMany({
            where: {
              direction: "OUTBOUND",
              from: SUPPORT_MAILBOX,
              rfcMessageId: { in: references },
              to: { has: from },
              conversation: { gmailThreadId: null },
            },
            select: { conversationId: true },
          })
        : [];
      const ids = [...new Set(candidates.map((item) => item.conversationId))];
      if (ids.length === 1)
        conversation = await tx.partnerConversation.findUniqueOrThrow({
          where: { id: ids[0] },
        });
    }
    if (!conversation) {
      const match = await matchCompany(
        tx,
        direction === "INBOUND"
          ? from
          : to.find((value) => value !== SUPPORT_MAILBOX) || "",
      );
      conversation = await tx.partnerConversation.create({
        data: {
          gmailThreadId: message.threadId,
          subject,
          participants: [...new Set([from, ...to, ...cc])],
          labels: [],
          ...match,
          ...(match.assignedAdminId ? { assignedAt: new Date() } : {}),
        },
      });
    }
    if (!conversation.gmailThreadId) {
      conversation = await tx.partnerConversation.update({
        where: { id: conversation.id },
        data: { gmailThreadId: message.threadId },
      });
    }
    const data = {
      gmailMessageId: message.id,
      direction,
      from,
      to,
      cc,
      bcc,
      subject,
      text: content.text,
      html: content.html,
      replyTo: addresses(header(message.payload, "reply-to"))[0] || null,
      inReplyTo: messageIds(header(message.payload, "in-reply-to"))[0] || null,
      references: messageIds(header(message.payload, "references")),
      ...(gmailDraftId ? { gmailDraftId } : {}),
      providerLabels: message.labelIds || [],
      receivedAt,
      status: message.labelIds?.includes("DRAFT")
        ? linked?.authorId
          ? "DRAFT"
          : "PROVIDER_DRAFT"
        : direction === "OUTBOUND"
          ? "SENT"
          : "SYNCED",
      ...(direction === "OUTBOUND" ? { sentAt: receivedAt } : {}),
    };
    const saved = linked
      ? await tx.partnerMessage.update({ where: { id: linked.id }, data })
      : await tx.partnerMessage.create({
          data: { ...data, rfcMessageId: rfc, conversationId: conversation.id },
        });
    if (
      linked?.status === "PROVIDER_DRAFT" &&
      linked.gmailMessageId !== message.id
    )
      await tx.partnerAttachment.deleteMany({ where: { messageId: saved.id } });
    if (
      saved.outreachMessageId &&
      direction === "OUTBOUND" &&
      !message.labelIds?.includes("DRAFT")
    ) {
      const { finishInboxOutreach } = await import(
        "@/lib/partner-inbox-outgoing"
      );
      await finishInboxOutreach(tx, saved.outreachMessageId, receivedAt, rfc);
    }
    for (const attachment of content.attachments.filter(
      () => !linked?.authorId,
    ))
      await tx.partnerAttachment.upsert({
        where: {
          messageId_providerPartId: {
            messageId: saved.id,
            providerPartId: attachment.providerPartId,
          },
        },
        create: { messageId: saved.id, ...attachment },
        update: { providerAttachmentId: attachment.providerAttachmentId },
      });
    const all = await tx.partnerMessage.findMany({
      where: {
        conversationId: conversation.id,
        status: { notIn: ["DRAFT", "PROVIDER_DRAFT", "DELETED"] },
      },
      orderBy: { receivedAt: "desc" },
      select: {
        direction: true,
        receivedAt: true,
        text: true,
        providerLabels: true,
        from: true,
        to: true,
        cc: true,
      },
    });
    const latest = all[0];
    if (latest)
      await tx.partnerConversation.update({
        where: { id: conversation.id },
        data: {
          preview: latest.text.slice(0, 250),
          lastMessageAt: latest.receivedAt,
          ...(!conversation.pendingProviderChanges
            ? {
                unread: all.some((item) =>
                  item.providerLabels.includes("UNREAD"),
                ),
                archived: !all.some((item) =>
                  item.providerLabels.includes("INBOX"),
                ),
                spam: all.some((item) => item.providerLabels.includes("SPAM")),
              }
            : {}),
          participants: [
            ...new Set(
              all.flatMap((item) => [item.from, ...item.to, ...item.cc]),
            ),
          ],
          waitingFor: latest.direction === "INBOUND" ? "TEAM" : "PARTNER",
          ...(!linked && direction === "INBOUND"
            ? { status: "OPEN", resolvedAt: null }
            : {}),
        },
      });
    if (!linked)
      await tx.partnerInboxActivity.create({
        data: {
          conversationId: conversation.id,
          action:
            direction === "INBOUND" ? "email_received" : "email_sent_synced",
        },
      });
    return saved;
  });
}

type Page = {
  messages?: Array<{ id: string }>;
  nextPageToken?: string;
  historyId?: string;
  history?: Array<{
    messages?: Array<{ id: string }>;
    messagesAdded?: Array<{ message: { id: string } }>;
    messagesDeleted?: Array<{ message: { id: string } }>;
    labelsAdded?: Array<{ message: { id: string } }>;
    labelsRemoved?: Array<{ message: { id: string } }>;
  }>;
};
export async function syncPartnerInbox(
  force = false,
  connect = gmailConnection,
) {
  const owner = randomUUID();
  const claimed = await prisma.partnerMailbox.updateMany({
    where: {
      id: "support",
      encryptedRefreshToken: { not: null },
      AND: [
        { OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
        ...(force
          ? []
          : [
              {
                OR: [
                  { nextAttemptAt: null },
                  { nextAttemptAt: { lte: new Date() } },
                ],
              },
            ]),
      ],
    },
    data: { leaseOwner: owner, leaseUntil: new Date(Date.now() + 180000) },
  });
  if (!claimed.count) return { processed: 0, skipped: true };
  try {
    const connection = await connect();
    const mailbox = connection.mailbox;
    const { bridgeRecruitmentMessages } = await import(
      "@/lib/partner-inbox-outgoing"
    );
    await bridgeRecruitmentMessages();
    const pending = await prisma.partnerConversation.findMany({
      where: {
        pendingProviderChanges: { not: Prisma.DbNull },
        gmailThreadId: { not: null },
        OR: [
          { providerChangeNextAt: null },
          { providerChangeNextAt: { lte: new Date() } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: "asc" },
    });
    for (const conversation of pending) {
      await renewLease(owner);
      const changes = conversation.pendingProviderChanges as Record<
        string,
        boolean
      >;
      const addLabelIds: string[] = [],
        removeLabelIds: string[] = [];
      for (const [field, label, inverted] of [
        ["unread", "UNREAD", false],
        ["archived", "INBOX", true],
        ["spam", "SPAM", false],
      ] as const) {
        if (typeof changes[field] === "boolean")
          (changes[field] !== inverted ? addLabelIds : removeLabelIds).push(
            label,
          );
      }
      try {
        await connection.request(
          `/threads/${encodeURIComponent(conversation.gmailThreadId!)}/modify`,
          "POST",
          { addLabelIds, removeLabelIds },
        );
        await prisma.partnerConversation.updateMany({
          where: { id: conversation.id, version: conversation.version },
          data: {
            pendingProviderChanges: Prisma.DbNull,
            providerChangeError: null,
            providerChangeFailures: 0,
            providerChangeNextAt: null,
          },
        });
      } catch {
        const failures = conversation.providerChangeFailures + 1;
        await prisma.partnerConversation.updateMany({
          where: { id: conversation.id, version: conversation.version },
          data: {
            providerChangeError:
              "Mailbox change is pending; it will retry automatically.",
            providerChangeFailures: failures,
            providerChangeNextAt: new Date(
              Date.now() +
                Math.min(3600000, 30000 * 2 ** Math.min(failures, 7)),
            ),
          },
        });
      }
    }
    let initialHistoryId = mailbox.initialHistoryId;
    let page: Page;
    if (!mailbox.initialSyncComplete) {
      if (!initialHistoryId)
        initialHistoryId = (
          await connection.request<{ historyId: string }>("/profile")
        ).historyId;
      page = await connection.request<Page>(
        `/messages?maxResults=50&includeSpamTrash=true&q=${encodeURIComponent("newer_than:30d -in:chats")}${mailbox.initialPageToken ? `&pageToken=${encodeURIComponent(mailbox.initialPageToken)}` : ""}`,
      );
    } else {
      page = await connection.request<Page>(
        `/history?maxResults=100&startHistoryId=${encodeURIComponent(mailbox.historyId!)}${mailbox.initialPageToken ? `&pageToken=${encodeURIComponent(mailbox.initialPageToken)}` : ""}`,
      );
    }
    const ids = new Set(page.messages?.map((item) => item.id) || []);
    for (const item of page.history || []) {
      item.messages?.forEach((message) => ids.add(message.id));
      for (const entries of [
        item.messagesAdded,
        item.messagesDeleted,
        item.labelsAdded,
        item.labelsRemoved,
      ])
        entries?.forEach((entry) => ids.add(entry.message.id));
    }
    let processed = 0;
    const visited = new Set<string>();
    for (const id of ids) {
      if (visited.has(id)) continue;
      const lease = await prisma.partnerMailbox.updateMany({
        where: { id: "support", leaseOwner: owner },
        data: { leaseUntil: new Date(Date.now() + 180000) },
      });
      if (!lease.count) throw new Error("Mailbox sync lease changed.");
      try {
        const message = await connection.request<GmailMessage>(
          `/messages/${encodeURIComponent(id)}?format=full`,
        );
        const known = await prisma.partnerConversation.findUnique({
          where: { gmailThreadId: message.threadId },
          select: { id: true },
        });
        // A recent message can belong to an older thread. Import the entire thread once.
        const thread = known
          ? { messages: [message] }
          : await connection.request<{ messages?: GmailMessage[] }>(
              `/threads/${encodeURIComponent(message.threadId)}?format=full`,
            );
        for (const item of thread.messages?.length
          ? thread.messages
          : [message]) {
          await renewLease(owner);
          for (const part of flattenParts(item.payload)) {
            if (
              !part.filename &&
              ["text/plain", "text/html"].includes(part.mimeType || "") &&
              !part.body?.data &&
              part.body?.attachmentId &&
              (part.body.size || 0) <= 2_000_000
            ) {
              const content = await connection.request<{ data: string }>(
                `/messages/${encodeURIComponent(item.id)}/attachments/${encodeURIComponent(part.body.attachmentId)}`,
              );
              part.body.data = content.data;
            }
          }
          await persistGmailMessage(item);
          visited.add(item.id);
          processed++;
        }
      } catch (error) {
        if (error instanceof InboxProviderError && error.status === 404) {
          const deleted = await prisma.partnerMessage.findUnique({
            where: { gmailMessageId: id },
            select: { conversationId: true },
          });
          await prisma.partnerMessage.updateMany({
            where: { gmailMessageId: id },
            data: { status: "DELETED", providerLabels: [] },
          });
          if (deleted) {
            const remaining = await prisma.partnerMessage.findMany({
              where: {
                conversationId: deleted.conversationId,
                status: { not: "DELETED" },
              },
              select: { providerLabels: true },
            });
            await prisma.partnerConversation.updateMany({
              where: {
                id: deleted.conversationId,
                pendingProviderChanges: { equals: Prisma.DbNull },
              },
              data: {
                unread: remaining.some((item) =>
                  item.providerLabels.includes("UNREAD"),
                ),
                archived: !remaining.some((item) =>
                  item.providerLabels.includes("INBOX"),
                ),
              },
            });
          }
        } else throw error;
      }
    }
    await prisma.partnerMailbox.updateMany({
      where: { id: "support", leaseOwner: owner },
      data: {
        initialHistoryId,
        initialPageToken: page.nextPageToken || null,
        ...(!page.nextPageToken
          ? {
              historyId: mailbox.initialSyncComplete
                ? page.historyId || mailbox.historyId
                : initialHistoryId,
              initialSyncComplete: true,
            }
          : {}),
        lastSyncedAt: new Date(),
        nextAttemptAt: null,
        lastError: null,
        failureCount: 0,
      },
    });
    await prisma.partnerMessage.updateMany({
      where: {
        status: "SENDING",
        updatedAt: { lt: new Date(Date.now() - 600000) },
      },
      data: {
        status: "NEEDS_REVIEW",
        lastError:
          "Sending was interrupted. Check Gmail Sent; automatic resend is blocked.",
      },
    });
    const { syncInboxDrafts } = await import("@/lib/partner-inbox-outgoing");
    await syncInboxDrafts(connection, () => renewLease(owner)).catch(
      () => undefined,
    );
    return { processed, skipped: false };
  } catch (error) {
    const expired = error instanceof InboxProviderError && error.status === 404;
    const mailbox = await prisma.partnerMailbox.findUnique({
      where: { id: "support" },
      select: { failureCount: true },
    });
    const failures = (mailbox?.failureCount || 0) + 1;
    await prisma.partnerMailbox.updateMany({
      where: { id: "support", leaseOwner: owner },
      data: {
        failureCount: failures,
        nextAttemptAt: new Date(
          Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(failures, 7)),
        ),
        lastError:
          error instanceof InboxProviderError && error.status === 401
            ? "Google connection needs owner reauthorisation."
            : expired
              ? "Mailbox history expired; rebuilding the recent message index."
              : "Mailbox synchronisation failed. It will retry automatically.",
        ...(expired
          ? {
              initialSyncComplete: false,
              initialHistoryId: null,
              initialPageToken: null,
            }
          : {}),
      },
    });
    return { processed: 0, failed: true };
  } finally {
    await prisma.partnerMailbox.updateMany({
      where: { id: "support", leaseOwner: owner },
      data: { leaseUntil: null, leaseOwner: null },
    });
  }
}

async function renewLease(owner: string) {
  const renewed = await prisma.partnerMailbox.updateMany({
    where: { id: "support", leaseOwner: owner },
    data: { leaseUntil: new Date(Date.now() + 180000) },
  });
  if (!renewed.count) throw new Error("Mailbox lease changed.");
}
