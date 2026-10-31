import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/db";
import {
  locked,
  saveProspect,
  setProspectStatus,
  suppressContact,
} from "../lib/recruitment";
import {
  checkInboxActor,
  inboxConversation,
  type InboxActor,
} from "../lib/partner-inbox-access";
import {
  InboxProviderError,
  type gmailConnection,
} from "../lib/partner-inbox-google";
import {
  persistGmailMessage,
  syncPartnerInbox,
} from "../lib/partner-inbox-sync";
import {
  bridgeRecruitmentMessages,
  buildInboxMime,
  reviewInboxSend,
  saveInboxDraft,
  sendInboxDraft,
  syncInboxDrafts,
} from "../lib/partner-inbox-outgoing";
import {
  inboxAttachmentBytes,
  scanAndStoreInboxAttachment,
} from "../lib/partner-inbox-attachments";
import {
  sealInboxSecret,
  SUPPORT_MAILBOX,
  type GmailMessage,
} from "../lib/partner-inbox-policy";

const database = process.env.INBOX_TEST_DATABASE_URL;
test(
  "partner inbox uses real database, MIME and isolated provider transport",
  { skip: !database, timeout: 180000 },
  async (t) => {
    const url = new URL(database!);
    assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
    assert.ok(url.pathname.endsWith("_test"));
    assert.equal(process.env.DATABASE_URL, database);
    const tag = randomUUID();
    const user = async (
      name: string,
      owner = false,
      enabled = true,
      send = true,
    ) =>
      prisma.user.create({
        data: {
          name,
          email: `${name}-${tag}@validation.invalid`,
          passwordHash: "unused-test-hash",
          role: "ADMIN",
          adminRole: owner ? "OWNER" : "RECRUITMENT_ADMIN",
          canAccessPartnerInbox: enabled,
          canSendPartnerInbox: send,
          emailVerifiedAt: new Date(),
        },
      });
    const ownerUser = await user("inbox-owner", true);
    const recruiter = await user("inbox-colleague");
    const denied = await user("inbox-denied", false, false);
    const readonly = await user("inbox-readonly", false, true, false);
    const actor = (
      id: string,
      role: InboxActor["role"] = "RECRUITMENT_ADMIN",
    ): InboxActor => ({
      id,
      role,
      canSend: false,
      canViewLeads: false,
      canInboxSend: true,
    });
    const owner = actor(ownerUser.id, "OWNER"),
      colleague = actor(recruiter.id);
    const prospect = await locked((tx) =>
      saveProspect(tx, colleague, {
        companyName: `Inbox Movers ${tag}`,
        contactName: "Known Partner",
        email: `partner-${tag}@validation.invalid`,
        phone: "0212345678",
        emailAvailability: "PUBLIC",
        phoneAvailability: "PUBLIC",
        serviceAreas: ["Auckland"],
        consentBasis: "EXPRESS",
        consentEvidence:
          "Local provider test only; not a real outreach recipient",
      }),
    );
    const partner = prospect.email!;
    const messages = new Map<string, GmailMessage>();
    const providerDrafts = new Map<string, string>();
    const sentRaw: string[] = [],
      modified: unknown[] = [];
    let failHistory = false,
      expiredHistory = false,
      failSend = 0,
      loseSendReceipt = false,
      failDraftCreate = false;
    const incoming = (
      id: string,
      threadId: string,
      from = partner,
      rfc = `<${id}@validation.invalid>`,
      text = "Please explain the partner service.",
      extra: Array<{ name: string; value: string }> = [],
    ): GmailMessage => ({
      id,
      threadId,
      labelIds: ["INBOX", "UNREAD"],
      internalDate: String(Date.now()),
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "From", value: from },
          { name: "To", value: SUPPORT_MAILBOX },
          { name: "Subject", value: "Partner enquiry" },
          { name: "Message-ID", value: rfc },
          ...extra,
        ],
        body: { data: Buffer.from(text).toString("base64url") },
      },
    });
    const initial = incoming(`inbound-${tag}`, `thread-${tag}`);
    messages.set(initial.id, initial);
    const makeProviderMessage = async (
      raw: string,
      id: string,
      threadId: string,
      draft = false,
    ) => {
      const rfc = raw.match(/^Message-ID:\s*(.+)$/im)?.[1].trim();
      const row = await prisma.partnerMessage.findFirstOrThrow({
        where: { rfcMessageId: rfc },
      });
      return {
        ...incoming(id, threadId, SUPPORT_MAILBOX, rfc, row.text, [
          { name: "In-Reply-To", value: row.inReplyTo || "" },
        ]),
        labelIds: [draft ? "DRAFT" : "SENT"],
        payload: {
          mimeType: "text/plain",
          headers: [
            { name: "From", value: SUPPORT_MAILBOX },
            { name: "To", value: row.to.join(", ") },
            { name: "Cc", value: row.cc.join(", ") },
            { name: "Bcc", value: row.bcc.join(", ") },
            { name: "Subject", value: row.subject },
            { name: "Message-ID", value: rfc! },
            { name: "In-Reply-To", value: row.inReplyTo || "" },
          ],
          body: { data: Buffer.from(row.text).toString("base64url") },
        },
      };
    };
    const server = createServer(async (req, res) => {
      try {
        const requestUrl = new URL(req.url!, "http://127.0.0.1");
        const path = requestUrl.pathname;
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const body = chunks.length
          ? JSON.parse(Buffer.concat(chunks).toString())
          : {};
        let result: unknown = {};
        if (path === "/profile") result = { historyId: "100" };
        else if (path === "/history") {
          if (expiredHistory) {
            res.statusCode = 404;
            expiredHistory = false;
          } else if (failHistory) res.statusCode = 503;
          else
            result = {
              historyId: "101",
              history: [
                {
                  messagesAdded: [...messages.keys()].map((id) => ({
                    message: { id },
                  })),
                },
              ],
            };
        } else if (path === "/messages" && req.method === "GET") {
          const query = requestUrl.searchParams.get("q") || "";
          result = {
            messages: [...messages.values()]
              .filter(
                (message) =>
                  !query.includes("rfc822msgid:") ||
                  (message.labelIds?.includes("SENT") &&
                    query.includes(
                      message.payload!.headers!.find(
                        (h) => h.name === "Message-ID",
                      )!.value,
                    )),
              )
              .map(({ id }) => ({ id })),
          };
        } else if (path.startsWith("/threads/") && req.method === "GET") {
          result = {
            messages: [...messages.values()].filter(
              (item) =>
                item.threadId === decodeURIComponent(path.split("/")[2]),
            ),
          };
        } else if (path === "/messages/send") {
          if (failSend) res.statusCode = failSend;
          else {
            const raw = Buffer.from(body.raw, "base64url").toString();
            sentRaw.push(raw);
            const id = `sent-${randomUUID()}`,
              threadId = body.threadId || `sent-thread-${randomUUID()}`;
            messages.set(id, await makeProviderMessage(raw, id, threadId));
            result = { id, threadId };
            if (loseSendReceipt) {
              res.destroy();
              return;
            }
          }
        } else if (path.startsWith("/messages/")) {
          result = messages.get(decodeURIComponent(path.split("/")[2]));
          if (!result) res.statusCode = 404;
        } else if (path.includes("/threads/") && path.endsWith("/modify"))
          modified.push(body);
        else if (path === "/drafts" && req.method === "GET")
          result = {
            drafts: [...providerDrafts].map(([id, messageId]) => ({
              id,
              message: { id: messageId },
            })),
          };
        else if (
          path.startsWith("/drafts") &&
          ["POST", "PUT"].includes(req.method!)
        ) {
          if (failDraftCreate) {
            res.destroy();
            return;
          }
          const id =
            req.method === "PUT" ? path.split("/")[2] : `draft-${randomUUID()}`;
          const messageId = `draft-message-${randomUUID()}`,
            thread = body.message.threadId || `draft-thread-${randomUUID()}`;
          messages.set(
            messageId,
            await makeProviderMessage(
              Buffer.from(body.message.raw, "base64url").toString(),
              messageId,
              thread,
              true,
            ),
          );
          providerDrafts.set(id, messageId);
          result = { id, message: { id: messageId } };
        } else if (path.startsWith("/drafts/") && req.method === "DELETE") {
          const id = path.split("/")[2];
          const messageId = providerDrafts.get(id);
          if (messageId) messages.delete(messageId);
          providerDrafts.delete(id);
        } else res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result || {}));
      } catch {
        res.statusCode = 500;
        res.end("{}");
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    const connect: typeof gmailConnection = async () => ({
      mailbox: await prisma.partnerMailbox.findUniqueOrThrow({
        where: { id: "support" },
      }),
      async request<T>(
        path: string,
        method = "GET",
        body?: unknown,
      ): Promise<T> {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        if (!response.ok) throw new InboxProviderError(response.status);
        return response.json() as Promise<T>;
      },
    });
    t.after(async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    });
    await prisma.partnerMailbox.upsert({
      where: { id: "support" },
      create: {
        address: SUPPORT_MAILBOX,
        encryptedRefreshToken: sealInboxSecret("local-only-token"),
      },
      update: {
        encryptedRefreshToken: sealInboxSecret("local-only-token"),
        initialSyncComplete: false,
        initialPageToken: null,
        initialHistoryId: null,
        nextAttemptAt: null,
        leaseUntil: null,
        leaseOwner: null,
      },
    });

    await t.test(
      "explicit access, send permission, fresh account state and assignment scope are enforced",
      async () => {
        await assert.rejects(
          locked((tx) => checkInboxActor(tx, actor(denied.id))),
          /not been granted/,
        );
        await assert.rejects(
          locked((tx) => checkInboxActor(tx, actor(readonly.id), true)),
          /sending permission/,
        );
        await locked((tx) => checkInboxActor(tx, owner, true));
        await prisma.user.update({
          where: { id: denied.id },
          data: { adminDisabledAt: new Date() },
        });
        await assert.rejects(
          locked((tx) => checkInboxActor(tx, actor(denied.id))),
          /access has changed/,
        );
      },
    );
    await t.test(
      "initial import, exact company matching and repeated sync are idempotent",
      async () => {
        assert.equal((await syncPartnerInbox(true, connect)).processed, 1);
        const row = await prisma.partnerMessage.findUniqueOrThrow({
          where: { gmailMessageId: initial.id },
          include: { conversation: true },
        });
        assert.equal(row.conversation.prospectId, prospect.id);
        assert.equal(row.conversation.assignedAdminId, recruiter.id);
        await syncPartnerInbox(true, connect);
        assert.equal(
          await prisma.partnerMessage.count({
            where: { gmailMessageId: initial.id },
          }),
          1,
        );
        await assert.rejects(
          locked((tx) =>
            inboxConversation(tx, actor(readonly.id), row.conversationId),
          ),
          /not found/,
        );
      },
    );
    const original = await prisma.partnerMessage.findUniqueOrThrow({
      where: { gmailMessageId: initial.id },
    });
    const conversationId = original.conversationId;
    const reply = () =>
      saveInboxDraft(colleague, {
        mode: "replyAll",
        conversationId,
        parentId: original.id,
        to: [partner],
        subject: "Re: Partner enquiry",
        text: "Thanks for your enquiry. Here is the requested information.",
        purpose: "REPLY",
      });
    await t.test(
      "unknown senders remain unlinked; untrusted Message-ID cannot overwrite another message",
      async () => {
        const unknown = incoming(
          `unknown-${tag}`,
          `unknown-thread-${tag}`,
          "unknown@validation.invalid",
          original.rfcMessageId!,
        );
        const row = await persistGmailMessage(unknown);
        assert.notEqual(row.id, original.id);
        assert.equal(
          (
            await prisma.partnerConversation.findUniqueOrThrow({
              where: { id: row.conversationId },
            })
          ).prospectId,
          null,
        );
      },
    );
    await t.test(
      "lease and optimistic versions prevent concurrent edits",
      async () => {
        await prisma.partnerConversation.update({
          where: { id: conversationId },
          data: {
            draftOwnerId: owner.id,
            draftLeaseUntil: new Date(Date.now() + 60000),
          },
        });
        await assert.rejects(reply(), /Another team member/);
        await prisma.partnerConversation.update({
          where: { id: conversationId },
          data: { draftOwnerId: null, draftLeaseUntil: null },
        });
        const draft = await reply();
        await assert.rejects(
          saveInboxDraft(colleague, {
            ...draft,
            serviceReason: undefined,
            mode: "reply",
            id: draft.id,
            conversationId,
            parentId: original.id,
            version: draft.version - 1,
          }),
          /Draft changed/,
        );
      },
    );
    await t.test(
      "reply headers and Bcc are preserved; internal notes and service reasons never enter MIME",
      async () => {
        await prisma.partnerInboxNote.create({
          data: {
            conversationId,
            authorId: owner.id,
            text: "STRICTLY_PRIVATE_INTERNAL_NOTE_123",
          },
        });
        const draft = await reply();
        const built = await buildInboxMime(draft.id),
          raw = Buffer.from(built.raw, "base64url").toString();
        assert.match(raw, /^From:.*support@matchnmove.co.nz/m);
        assert.match(raw, /^In-Reply-To:/m);
        assert.match(raw, /^References:/m);
        assert.doesNotMatch(raw, /STRICTLY_PRIVATE_INTERNAL_NOTE/);
        const service = await saveInboxDraft(owner, {
          mode: "new",
          to: [partner],
          bcc: ["audit@validation.invalid"],
          subject: "Requested service assistance",
          text: "Here is your requested information.",
          purpose: "SERVICE",
          serviceReason:
            "INTERNAL_SERVICE_REASON_123 about a requested support interaction",
        });
        const serviceRaw = Buffer.from(
          (await buildInboxMime(service.id)).raw,
          "base64url",
        ).toString();
        assert.match(serviceRaw, /^Bcc: audit@validation.invalid/m);
        assert.doesNotMatch(serviceRaw, /INTERNAL_SERVICE_REASON/);
      },
    );
    await t.test(
      "reply cannot add a stranger as recipient and simultaneous approvals send once",
      async () => {
        const invalid = await saveInboxDraft(colleague, {
          mode: "reply",
          conversationId,
          parentId: original.id,
          to: ["stranger@validation.invalid"],
          subject: "Re: Partner enquiry",
          text: "Requested information",
          purpose: "REPLY",
        });
        await assert.rejects(
          sendInboxDraft(colleague, invalid.id, invalid.version, connect),
          /Reply recipients/,
        );
        const draft = await reply(),
          before = sentRaw.length;
        const results = await Promise.allSettled([
          sendInboxDraft(colleague, draft.id, draft.version, connect),
          sendInboxDraft(colleague, draft.id, draft.version, connect),
        ]);
        assert.equal(
          results.filter((item) => item.status === "fulfilled").length,
          1,
        );
        assert.equal(sentRaw.length, before + 1);
        assert.equal(
          (
            await prisma.partnerMessage.findUniqueOrThrow({
              where: { id: draft.id },
            })
          ).status,
          "SENT",
        );
      },
    );
    await t.test(
      "a second external reply stays in the same thread and preserves the company",
      async () => {
        const response = incoming(
          `second-${tag}`,
          initial.threadId,
          partner,
          `<second-${tag}@validation.invalid>`,
          "Thank you, please send registration details.",
        );
        messages.set(response.id, response);
        await syncPartnerInbox(true, connect);
        const row = await prisma.partnerMessage.findUniqueOrThrow({
          where: { gmailMessageId: response.id },
          include: { conversation: true },
        });
        assert.equal(row.conversationId, conversationId);
        assert.equal(row.conversation.prospectId, prospect.id);
        assert.equal(row.conversation.waitingFor, "TEAM");
      },
    );
    await t.test(
      "forward creates a new thread, quotes only the selected message and survives a second save",
      async () => {
        await prisma.partnerConversation.update({
          where: { id: conversationId },
          data: { draftOwnerId: null, draftLeaseUntil: null },
        });
        const forwarded = await saveInboxDraft(owner, {
          mode: "forward",
          conversationId,
          parentId: original.id,
          to: ["colleague@validation.invalid"],
          subject: "Fwd: Partner enquiry",
          text: "Please assist with this support request.",
          purpose: "SERVICE",
          serviceReason:
            "Existing partner requested help from our operations colleague",
        });
        assert.notEqual(forwarded.conversationId, conversationId);
        assert.equal(forwarded.inReplyTo, null);
        assert.match(forwarded.text, /Forwarded message/);
        assert.doesNotMatch(forwarded.text, /STRICTLY_PRIVATE/);
        const updated = await saveInboxDraft(owner, {
          ...forwarded,
          id: forwarded.id,
          version: forwarded.version,
          conversationId: forwarded.conversationId,
          mode: "new",
          text: forwarded.composeText,
        });
        assert.equal(updated.text, forwarded.text);
      },
    );
    await t.test(
      "uncertain send is blocked from retry and reconciles a provider-accepted message",
      async () => {
        const draft = await reply();
        loseSendReceipt = true;
        await assert.rejects(
          sendInboxDraft(colleague, draft.id, draft.version, connect),
        );
        loseSendReceipt = false;
        assert.equal(
          (
            await prisma.partnerMessage.findUniqueOrThrow({
              where: { id: draft.id },
            })
          ).status,
          "NEEDS_REVIEW",
        );
        await assert.rejects(
          sendInboxDraft(colleague, draft.id, draft.version, connect),
          /already attempted/,
        );
        const result = await reviewInboxSend(
          owner,
          draft.id,
          "Checked Gmail Sent carefully for the exact message identifier",
          connect,
        );
        assert.equal(result.foundSent, true);
        assert.equal(
          (
            await prisma.partnerMessage.findUniqueOrThrow({
              where: { id: draft.id },
            })
          ).status,
          "SENT",
        );
      },
    );
    await t.test(
      "definitive provider refusal keeps a reply editable, without recording a sent email",
      async () => {
        const draft = await reply(),
          before = sentRaw.length;
        failSend = 429;
        await assert.rejects(
          sendInboxDraft(colleague, draft.id, draft.version, connect),
        );
        failSend = 0;
        assert.equal(
          (
            await prisma.partnerMessage.findUniqueOrThrow({
              where: { id: draft.id },
            })
          ).status,
          "DRAFT",
        );
        assert.equal(sentRaw.length, before);
      },
    );
    await t.test(
      "provider outage preserves the cursor and backs off; expired history starts a resync",
      async () => {
        const before = (
          await prisma.partnerMailbox.findUniqueOrThrow({
            where: { id: "support" },
          })
        ).historyId;
        failHistory = true;
        assert.equal((await syncPartnerInbox(true, connect)).failed, true);
        failHistory = false;
        const after = await prisma.partnerMailbox.findUniqueOrThrow({
          where: { id: "support" },
        });
        assert.equal(after.historyId, before);
        assert.ok(after.nextAttemptAt);
        assert.equal(after.leaseOwner, null);
        assert.equal((await syncPartnerInbox(false, connect)).skipped, true);
        expiredHistory = true;
        await syncPartnerInbox(true, connect);
        assert.equal(
          (
            await prisma.partnerMailbox.findUniqueOrThrow({
              where: { id: "support" },
            })
          ).initialSyncComplete,
          false,
        );
        await syncPartnerInbox(true, connect);
      },
    );
    await t.test(
      "provider label intentions are retained locally and delivered idempotently",
      async () => {
        await prisma.partnerConversation.update({
          where: { id: conversationId },
          data: {
            unread: false,
            archived: true,
            pendingProviderChanges: { unread: false, archived: true },
          },
        });
        await persistGmailMessage(initial);
        assert.equal(
          (
            await prisma.partnerConversation.findUniqueOrThrow({
              where: { id: conversationId },
            })
          ).unread,
          false,
        );
        await syncPartnerInbox(true, connect);
        assert.ok(modified.length);
        assert.deepEqual(modified.at(-1), {
          addLabelIds: [],
          removeLabelIds: ["UNREAD", "INBOX"],
        });
      },
    );
    await t.test(
      "database sync lease prevents a second worker from claiming the mailbox",
      async () => {
        await prisma.partnerMailbox.update({
          where: { id: "support" },
          data: {
            leaseOwner: "other-worker",
            leaseUntil: new Date(Date.now() + 60000),
          },
        });
        assert.equal((await syncPartnerInbox(true, connect)).skipped, true);
        await prisma.partnerMailbox.update({
          where: { id: "support" },
          data: { leaseOwner: null, leaseUntil: null },
        });
      },
    );
    await t.test(
      "draft mirroring never blindly repeats an ambiguous Gmail draft create",
      async () => {
        const draft = await reply();
        failDraftCreate = true;
        await syncInboxDrafts(await connect());
        failDraftCreate = false;
        assert.equal(
          (
            await prisma.partnerMessage.findUniqueOrThrow({
              where: { id: draft.id },
            })
          ).draftMirrorUncertain,
          true,
        );
        const count = providerDrafts.size;
        await syncInboxDrafts(await connect());
        assert.equal(providerDrafts.size, count);
      },
    );
    await t.test(
      "promotional drafts preserve identity/unsubscribe tracking, send permission and global outreach safeguards",
      async () => {
        await prisma.recruitmentSetting.upsert({
          where: { key: "outreach" },
          create: {
            key: "outreach",
            value: {
              sendingEnabled: false,
              senderIdentity: "Match n Move\nBusiness contact details",
              autoTasks: true,
            },
          },
          update: {
            value: {
              sendingEnabled: false,
              senderIdentity: "Match n Move\nBusiness contact details",
              autoTasks: true,
            },
          },
        });
        const draft = await saveInboxDraft(colleague, {
          mode: "new",
          to: [partner],
          subject: "Company invitation",
          text: "Hello, we would like to introduce our moving quote platform to your company.",
          purpose: "OUTREACH",
        });
        assert.ok(draft.outreachMessageId);
        assert.match(draft.text, /Business contact details/);
        assert.match(draft.text, /unsubscribe/i);
        await assert.rejects(
          sendInboxDraft(colleague, draft.id, draft.version, connect),
          /sending permission/,
        );
        await assert.rejects(
          sendInboxDraft(owner, draft.id, draft.version, connect),
          /disabled|not been verified/,
        );
        const unknown = await locked((tx) =>
          saveProspect(tx, owner, {
            companyName: `Permission Unknown ${tag}`,
            email: `unreviewed-${tag}@validation.invalid`,
            emailAvailability: "PUBLIC",
            phoneAvailability: "NOT_PUBLIC",
            serviceAreas: ["Auckland"],
            consentBasis: "UNKNOWN",
            consentEvidence: "",
          }),
        );
        await assert.rejects(
          saveInboxDraft(owner, {
            mode: "new",
            to: [unknown.email],
            subject: "Invitation",
            text: "We would like to introduce our partner platform to your company.",
            purpose: "OUTREACH",
          }),
          /permission|review|consent/i,
        );
      },
    );
    await t.test(
      "stage and follow-up remain linked and no task sends email",
      async () => {
        const before = sentRaw.length;
        const current = await prisma.moverProspect.findUniqueOrThrow({
          where: { id: prospect.id },
        });
        await locked((tx) =>
          setProspectStatus(
            tx,
            colleague,
            prospect.id,
            "INTERESTED",
            current.version,
          ),
        );
        const task = await prisma.recruitmentTask.create({
          data: {
            title: "Discuss pricing",
            description: "Requested details",
            assignedAdminId: colleague.id,
            prospectId: prospect.id,
            conversationId,
            dueAt: new Date(),
            priority: "HIGH",
          },
        });
        assert.equal(task.conversationId, conversationId);
        assert.equal(sentRaw.length, before);
        assert.ok(
          (
            await prisma.moverProspect.findUniqueOrThrow({
              where: { id: prospect.id },
            })
          ).interestedAt,
        );
      },
    );
    await t.test(
      "legacy outreach bridge is idempotent and never resends",
      async () => {
        const outreach = await prisma.outreachMessage.findFirstOrThrow({
          where: { prospectId: prospect.id },
        });
        await prisma.outreachMessage.update({
          where: { id: outreach.id },
          data: { sentAt: new Date(), status: "SENT" },
        });
        const before = sentRaw.length;
        await bridgeRecruitmentMessages();
        await bridgeRecruitmentMessages();
        assert.equal(
          await prisma.partnerMessage.count({
            where: { outreachMessageId: outreach.id },
          }),
          1,
        );
        assert.equal(sentRaw.length, before);
      },
    );
    await t.test(
      "clean files use scanning and private S3 storage; malware and tampering block access",
      async () => {
        const objects = new Map<string, Buffer>();
        let infected = false;
        const files = createServer(async (req, res) => {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.from(chunk));
          const path = new URL(req.url!, "http://127.0.0.1").pathname;
          if (path === "/scan") {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                clean: !infected,
                status: infected ? "INFECTED" : "CLEAN",
              }),
            );
            return;
          }
          if (req.method === "PUT") {
            objects.set(path, Buffer.concat(chunks));
            res.setHeader("ETag", '"local-storage-test"');
            res.end();
          } else if (req.method === "GET" && objects.has(path)) {
            const bytes = objects.get(path)!;
            res.setHeader("Content-Length", bytes.length);
            res.end(bytes);
          } else {
            res.statusCode = 404;
            res.end();
          }
        });
        await new Promise<void>((resolve) =>
          files.listen(0, "127.0.0.1", resolve),
        );
        const port = (files.address() as { port: number }).port;
        const keys = [
          "MALWARE_SCAN_URL",
          "STORAGE_ENDPOINT",
          "STORAGE_ACCESS_KEY",
          "STORAGE_SECRET_KEY",
          "STORAGE_BUCKET",
          "STORAGE_REGION",
          "STORAGE_FORCE_PATH_STYLE",
        ];
        const old = new Map(keys.map((key) => [key, process.env[key]]));
        Object.assign(process.env, {
          MALWARE_SCAN_URL: `http://127.0.0.1:${port}/scan`,
          STORAGE_ENDPOINT: `http://127.0.0.1:${port}`,
          STORAGE_ACCESS_KEY: "local-only",
          STORAGE_SECRET_KEY: "local-only-test",
          STORAGE_BUCKET: "private-inbox-test",
          STORAGE_REGION: "us-east-1",
          STORAGE_FORCE_PATH_STYLE: "true",
        });
        try {
          const bytes = Buffer.from("%PDF-1.7\nLocal isolated attachment data");
          const stored = await scanAndStoreInboxAttachment(
            bytes,
            "insurance.pdf",
          );
          assert.equal(objects.size, 1);
          assert.equal(stored.scanStatus, "CLEAN");
          const attachment = await prisma.partnerAttachment.create({
            data: { messageId: original.id, ...stored },
          });
          assert.deepEqual(
            (await inboxAttachmentBytes(attachment.id)).bytes,
            bytes,
          );
          infected = true;
          await assert.rejects(
            scanAndStoreInboxAttachment(bytes, "infected.pdf"),
            /malware scan/,
          );
          assert.equal(objects.size, 1);
          objects.set([...objects.keys()][0], Buffer.from("tampered"));
          await assert.rejects(
            inboxAttachmentBytes(attachment.id),
            /integrity/,
          );
          await prisma.partnerAttachment.update({
            where: { id: attachment.id },
            data: { scanStatus: "BLOCKED" },
          });
          await assert.rejects(inboxAttachmentBytes(attachment.id), /blocked/);
        } finally {
          for (const [key, value] of old) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
          }
          files.closeAllConnections();
          await new Promise<void>((resolve) => files.close(() => resolve()));
        }
      },
    );
    await t.test(
      "missing scanner, oversized attachments and unreviewed contact suppression fail safely",
      async () => {
        delete process.env.MALWARE_SCAN_URL;
        await assert.rejects(
          scanAndStoreInboxAttachment(Buffer.from("%PDF-1.7"), "insurance.pdf"),
          /scanning|scanner/i,
        );
        await assert.rejects(
          scanAndStoreInboxAttachment(
            Buffer.alloc(10 * 1024 * 1024 + 1),
            "large.pdf",
          ),
          /10 MB/,
        );
        await locked((tx) =>
          suppressContact(
            tx,
            partner,
            "Local test stop",
            "inbox_test",
            owner.id,
          ),
        );
        const service = await saveInboxDraft(owner, {
          mode: "new",
          to: [partner],
          subject: "Operational support",
          text: "Requested assistance",
          purpose: "SERVICE",
          serviceReason:
            "Existing service request requires assistance from our support team",
        });
        await assert.rejects(
          sendInboxDraft(owner, service.id, service.version, connect),
          /unsuppressed/,
        );
      },
    );
  },
);
