import { randomUUID } from "node:crypto";
import MailComposer from "nodemailer/lib/mail-composer";
import { prisma } from "@/lib/db";
import {
  checkInboxActor,
  inboxConversation,
  inboxActivity,
  type InboxActor,
} from "@/lib/partner-inbox-access";
import {
  draftSchema,
  MAX_MESSAGE_BYTES,
  SUPPORT_MAILBOX,
  type GmailMessage,
} from "@/lib/partner-inbox-policy";
import {
  locked,
  fail,
  ownedProspect,
  prepareDraft,
  settings,
  type Tx,
} from "@/lib/recruitment";
import { editDraft, verifySend } from "@/lib/recruitment-outreach";
import { contactBlockReason } from "@/lib/recruitment-policy";
import {
  gmailConnection,
  InboxProviderError,
} from "@/lib/partner-inbox-google";
import { inboxAttachmentBytes } from "@/lib/partner-inbox-attachments";
import {
  onboardingConversation,
  persistGmailMessage,
} from "@/lib/partner-inbox-sync";

export async function saveInboxDraft(actor: InboxActor, raw: unknown) {
  const input = draftSchema.parse(raw);
  return locked(async (tx) => {
    await checkInboxActor(tx, actor, true);
    const original = input.conversationId
      ? await inboxConversation(tx, actor, input.conversationId)
      : null;
    if (!original && input.purpose !== "OUTREACH")
      fail(
        "Start an onboarding invitation for a company, or reply inside an existing onboarding conversation.",
      );
    const existing = input.id
      ? await tx.partnerMessage.findFirst({
          where: { id: input.id, conversationId: original?.id || "" },
        })
      : null;
    const parent = input.parentId
      ? await tx.partnerMessage.findFirst({
          where: {
            id: input.parentId,
            conversationId: original?.id || "",
            status: { notIn: ["DRAFT", "PROVIDER_DRAFT", "DELETED"] },
          },
        })
      : existing?.parentMessageId
        ? await tx.partnerMessage.findFirst({
            where: {
              id: existing.parentMessageId,
              conversationId: original?.id || "",
              direction: "INBOUND",
            },
          })
        : existing?.inReplyTo
          ? await tx.partnerMessage.findFirst({
              where: {
                conversationId: original?.id || "",
                rfcMessageId: existing.inReplyTo,
                direction: "INBOUND",
              },
            })
          : null;
    if (input.mode !== "new" && (!original || !parent))
      fail("Select the original message before replying or forwarding.");
    if (
      input.purpose === "REPLY" &&
      (input.mode === "new" ||
        input.mode === "forward" ||
        parent?.direction !== "INBOUND")
    )
      fail("An enquiry reply needs a received message.");
    if (input.purpose === "SERVICE" && (input.serviceReason?.length || 0) < 20)
      fail("Record the reason for this operational message.");
    if (
      original?.draftOwnerId &&
      original.draftOwnerId !== actor.id &&
      original.draftLeaseUntil &&
      original.draftLeaseUntil > new Date()
    )
      fail(
        "Another team member is drafting. Wait for their draft lease to expire.",
        409,
      );
    if (
      input.id &&
      (!existing ||
        existing.status !== "DRAFT" ||
        existing.version !== input.version)
    )
      fail(
        "Draft changed or is already sending. Reload before continuing.",
        409,
      );
    if (
      existing?.authorId &&
      existing.authorId !== actor.id &&
      actor.role !== "OWNER"
    )
      fail("Only the draft author or an owner can edit it.", 403);
    const recipientCompany =
      input.purpose === "OUTREACH"
        ? await tx.moverProspect.findFirst({ where: { email: input.to[0] } })
        : null;
    const prospect = recipientCompany
      ? await ownedProspect(tx, actor, recipientCompany.id)
      : input.prospectId
        ? await ownedProspect(tx, actor, input.prospectId)
        : null;
    let outreach: Awaited<ReturnType<typeof editDraft>> | null = null;
    if (input.purpose === "OUTREACH") {
      if (
        !prospect ||
        input.to.length !== 1 ||
        input.cc.length ||
        input.bcc.length ||
        input.mode === "forward"
      )
        fail(
          "Partnership outreach needs one company with reviewed permission. Use a separate invitation per company.",
        );
      if (original?.prospectId && original.prospectId !== prospect.id)
        fail("Create a new conversation for another company.");
      const record = existing?.outreachMessageId
        ? await tx.outreachMessage.findUniqueOrThrow({
            where: { id: existing.outreachMessageId },
          })
        : await prepareDraft(tx, actor, prospect.id);
      if (record.prospectId !== prospect.id || record.status !== "DRAFT")
        fail(
          "This company already has an invitation in progress or sent. Use its existing conversation or approved follow-up.",
          409,
        );
      const paired = await tx.partnerMessage.findUnique({
        where: { outreachMessageId: record.id },
      });
      if (paired && paired.id !== existing?.id)
        fail("An invitation draft already exists in the inbox.", 409);
      outreach = await editDraft(tx, actor, {
        id: record.id,
        updatedAt: record.updatedAt.toISOString(),
        introduction: input.text,
      });
    } else if (existing?.outreachMessageId)
      fail(
        "Keep an invitation draft as outreach, or create a separate operational message.",
      );
    let conversation = original;
    if (!conversation || (input.mode === "forward" && !existing))
      conversation = await tx.partnerConversation.create({
        data: {
          onboardingTracked: true,
          subject: input.subject,
          participants: [
            ...new Set([SUPPORT_MAILBOX, ...input.to, ...input.cc]),
          ],
          labels: [],
          prospectId: prospect?.id || original?.prospectId || null,
          moverCompanyId:
            prospect?.moverCompanyId || original?.moverCompanyId || null,
          assignedAdminId: actor.id,
          waitingFor: "PARTNER",
          unread: false,
          archived: true,
        },
      });
    const quoted =
      input.mode === "forward" && parent
        ? `\n\n---------- Forwarded message ----------\nFrom: ${parent.from}\nDate: ${parent.receivedAt.toISOString()}\nSubject: ${parent.subject}\n\n${parent.text}`
        : "";
    const replySubject =
      parent && ["reply", "replyAll"].includes(input.mode)
        ? (/^re:/i.test(parent.subject)
            ? parent.subject
            : `Re: ${parent.subject}`
          ).replace(/[\r\n]+/g, " ")
        : null;
    const data = {
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: outreach?.subject || replySubject || input.subject,
      text: outreach?.text || input.text + quoted,
      html: outreach?.html || null,
      composeText: input.text + quoted,
      outreachMessageId: outreach?.id || null,
      outreachUpdatedAt: outreach?.updatedAt || null,
      purpose: input.purpose,
      serviceReason: input.serviceReason || null,
      draftDirty: true,
      inReplyTo:
        input.mode === "reply" || input.mode === "replyAll"
          ? parent?.rfcMessageId || null
          : null,
      parentMessageId:
        input.mode === "reply" || input.mode === "replyAll"
          ? parent?.id || null
          : null,
      references:
        input.mode === "reply" || input.mode === "replyAll"
          ? [
              ...(parent?.references || []),
              ...(parent?.rfcMessageId ? [parent.rfcMessageId] : []),
            ].slice(-50)
          : [],
    };
    const draft = existing
      ? await tx.partnerMessage.update({
          where: { id: existing.id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.partnerMessage.create({
          data: {
            ...data,
            conversationId: conversation.id,
            from: SUPPORT_MAILBOX,
            direction: "OUTBOUND",
            status: "DRAFT",
            providerLabels: [],
            authorId: actor.id,
            rfcMessageId: `<${randomUUID()}@matchnmove.co.nz>`,
          },
        });
    for (const attachmentId of input.attachmentIds) {
      const source = await tx.partnerAttachment.findFirst({
        where: {
          id: attachmentId,
          message: { conversationId: original?.id || "" },
          scanStatus: "CLEAN",
          storageKey: { not: null },
        },
      });
      if (!source)
        fail(
          "Only checked attachments from this conversation can be forwarded.",
        );
      if (
        !(await tx.partnerAttachment.findFirst({
          where: { messageId: draft.id, storageKey: source.storageKey },
        }))
      )
        await tx.partnerAttachment.create({
          data: {
            messageId: draft.id,
            fileName: source.fileName,
            mimeType: source.mimeType,
            size: source.size,
            storageKey: source.storageKey,
            sha256: source.sha256,
            scanStatus: "CLEAN",
          },
        });
    }
    await tx.partnerConversation.update({
      where: { id: conversation.id },
      data: {
        draftOwnerId: actor.id,
        draftLeaseUntil: new Date(Date.now() + 90000),
      },
    });
    await inboxActivity(
      tx,
      conversation.id,
      actor.id,
      existing
        ? "draft_saved"
        : input.mode === "forward"
          ? "forward_draft_created"
          : "draft_created",
    );
    return draft;
  });
}

export async function buildInboxMime(messageId: string) {
  const message = await prisma.partnerMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: { attachments: true, conversation: true },
  });
  const attachments = [];
  let total = Buffer.byteLength(message.text);
  for (const item of message.attachments) {
    if (item.scanStatus !== "CLEAN")
      fail("All attachments must pass scanning before sending.");
    const { bytes } = await inboxAttachmentBytes(item.id);
    total += bytes.length;
    if (total > MAX_MESSAGE_BYTES)
      fail("Combined message attachments are too large.");
    attachments.push({
      filename: item.fileName,
      content: bytes,
      contentType: item.mimeType,
    });
  }
  const compiled = new MailComposer({
    from: { name: "Match 'n Move", address: SUPPORT_MAILBOX },
    to: message.to,
    cc: message.cc,
    bcc: message.bcc,
    replyTo: SUPPORT_MAILBOX,
    subject: message.subject,
    text: message.text,
    html: message.html || undefined,
    messageId: message.rfcMessageId || undefined,
    inReplyTo: message.inReplyTo || undefined,
    references: message.references,
    attachments,
    disableFileAccess: true,
    disableUrlAccess: true,
  }).compile();
  compiled.keepBcc = true;
  const raw = await compiled.build();
  return { raw: raw.toString("base64url"), message };
}

async function checkRecipients(
  message: Awaited<ReturnType<typeof buildInboxMime>>["message"],
) {
  for (const email of [...message.to, ...message.cc, ...message.bcc]) {
    if (email === SUPPORT_MAILBOX) continue;
    const suppressed = await prisma.contactSuppression.findUnique({
      where: { email },
    });
    if (message.purpose === "REPLY") {
      const parent = await prisma.partnerMessage.findFirst({
        where: {
          conversationId: message.conversationId,
          direction: "INBOUND",
          ...(message.parentMessageId
            ? { id: message.parentMessageId }
            : { rfcMessageId: message.inReplyTo }),
        },
      });
      if (
        !parent ||
        ![parent.from, parent.replyTo, ...parent.to, ...parent.cc].includes(
          email,
        )
      )
        fail("Reply recipients must be participants in the received enquiry.");
      continue; // A direct response to an enquiry is distinct from promotional outreach.
    }
    if (message.purpose === "SERVICE") {
      if ((message.serviceReason?.length || 0) < 20 || suppressed)
        fail("An operational reason and unsuppressed recipient are required.");
      continue;
    }
    const prospect = await prisma.moverProspect.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!prospect)
      fail(
        "Link promotional recipients to company records with reviewed contact permission.",
      );
    const reason = contactBlockReason(prospect, Boolean(suppressed));
    if (reason) fail(reason);
  }
}

export async function sendInboxDraft(
  actor: InboxActor,
  id: string,
  version: number,
  connect = gmailConnection,
) {
  const claim = randomUUID();
  await locked(async (tx) => {
    await checkInboxActor(tx, actor, true);
    const row = await tx.partnerMessage.findUnique({ where: { id } });
    if (!row) fail("Draft not found.", 404);
    await inboxConversation(tx, actor, row.conversationId);
    if (row.status !== "DRAFT" || row.version !== version)
      fail("Draft changed or sending was already attempted.", 409);
    if (row.draftMirrorUntil && row.draftMirrorUntil > new Date())
      fail("Gmail is saving this draft. Try sending again shortly.", 409);
    if (row.authorId !== actor.id && actor.role !== "OWNER")
      fail("Only the draft author or owner can send this draft.", 403);
    if (row.purpose === "OUTREACH") {
      if (
        !row.outreachMessageId ||
        row.to.length !== 1 ||
        row.cc.length ||
        row.bcc.length
      )
        fail("Prepare a reviewed single-company invitation before sending.");
      const verified = await verifySend(tx, actor, row.outreachMessageId);
      if (
        verified.message.status !== "DRAFT" ||
        verified.message.updatedAt.getTime() !==
          row.outreachUpdatedAt?.getTime() ||
        verified.message.text !== row.text ||
        verified.prospect.email !== row.to[0]
      )
        fail("Invitation changed. Save and review the refreshed draft.", 409);
      const since = new Date(Date.now() - 86400000);
      if (
        (await tx.outreachMessage.count({
          where: { adminId: actor.id, approvedAt: { gte: since } },
        })) >= verified.config.dailyLimit
      )
        fail("Outreach send limit reached.", 429);
      if (
        await tx.outreachMessage.count({
          where: {
            id: { not: verified.message.id },
            prospectId: verified.prospect.id,
            approvedAt: { gte: since },
          },
        })
      )
        fail(
          "An invitation was already attempted for this company in the last 24 hours.",
          409,
        );
      const delivery = await tx.emailDelivery.upsert({
        where: { dedupeKey: `recruitment:${verified.message.id}` },
        create: {
          dedupeKey: `recruitment:${verified.message.id}`,
          kind: "recruitment_invitation",
          recipient: verified.prospect.email,
          from: SUPPORT_MAILBOX,
          replyTo: SUPPORT_MAILBOX,
          subject: row.subject,
          text: row.text,
          html: row.html || "",
          status: "SENDING",
          attempts: 1,
          maxAttempts: 1,
        },
        update: {
          status: "SENDING",
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      await tx.outreachMessage.update({
        where: { id: verified.message.id },
        data: {
          status: "SENDING",
          approvedAt: new Date(),
          adminId: actor.id,
          emailDeliveryId: delivery.id,
        },
      });
    }
    const count = await tx.partnerMessage.count({
      where: {
        authorId: actor.id,
        OR: [
          { sentAt: { gte: new Date(Date.now() - 86400000) } },
          { status: "SENDING" },
        ],
      },
    });
    if (count >= 100) fail("Daily inbox send limit reached.", 429);
    await tx.partnerMessage.update({
      where: { id },
      data: { status: "SENDING", sendClaim: claim, lastError: null },
    });
    await inboxActivity(
      tx,
      row.conversationId,
      actor.id,
      "send_explicitly_approved",
    );
  });
  let attempted = false;
  try {
    const built = await buildInboxMime(id);
    await checkRecipients(built.message);
    // Recheck live permissions after file reads, immediately before the provider request.
    await locked(async (tx) => {
      await checkInboxActor(tx, actor, true);
      await inboxConversation(tx, actor, built.message.conversationId);
      if (built.message.outreachMessageId)
        await verifySend(tx, actor, built.message.outreachMessageId);
    });
    const gmail = await connect();
    attempted = true;
    const sent = await gmail.request<{ id: string; threadId: string }>(
      "/messages/send",
      "POST",
      {
        raw: built.raw,
        ...(built.message.inReplyTo && built.message.conversation.gmailThreadId
          ? { threadId: built.message.conversation.gmailThreadId }
          : {}),
      },
    );
    const sentAt = new Date();
    await locked(async (tx) => {
      await tx.partnerMessage.update({
        where: { id },
        data: {
          gmailMessageId: sent.id,
          status: "SENT",
          sentAt,
          draftDirty: false,
          lastError: null,
        },
      });
      if (built.message.outreachMessageId)
        await finishInboxOutreach(
          tx,
          built.message.outreachMessageId,
          sentAt,
          built.message.rfcMessageId,
        );
      await tx.partnerConversation.update({
        where: { id: built.message.conversationId },
        data: {
          gmailThreadId:
            built.message.conversation.gmailThreadId || sent.threadId,
          waitingFor: "PARTNER",
          draftOwnerId: null,
          draftLeaseUntil: null,
          lastMessageAt: sentAt,
          preview: built.message.text.slice(0, 250),
        },
      });
      await inboxActivity(
        tx,
        built.message.conversationId,
        actor.id,
        "email_sent",
      );
    });
    if (built.message.gmailDraftId)
      await gmail
        .request(
          `/drafts/${encodeURIComponent(built.message.gmailDraftId)}`,
          "DELETE",
        )
        .catch(() => undefined);
    await gmail
      .request<GmailMessage>(
        `/messages/${encodeURIComponent(sent.id)}?format=full`,
      )
      .then(persistGmailMessage)
      .catch(() => undefined);
    return { ok: true, sent: true };
  } catch (error) {
    const paired = await prisma.partnerMessage.findUnique({
      where: { id },
      select: { outreachMessageId: true },
    });
    const definitive =
      !paired?.outreachMessageId &&
      (!attempted ||
        (error instanceof InboxProviderError &&
          [400, 401, 403, 404, 429].includes(error.status)));
    await prisma.partnerMessage.updateMany({
      where: { id, sendClaim: claim, status: "SENDING" },
      data: {
        status: definitive ? "DRAFT" : "NEEDS_REVIEW",
        sendClaim: null,
        lastError: definitive
          ? "Sending was blocked before acceptance. Check recipient permissions, attachments and mailbox setup."
          : "Delivery outcome is uncertain. Check Gmail Sent before any further action; automatic retries are blocked.",
      },
    });
    const failed = await prisma.partnerMessage.findUnique({
      where: { id },
      select: { outreachMessageId: true },
    });
    if (failed?.outreachMessageId)
      await locked(async (tx) => {
        const outreach = await tx.outreachMessage.findUniqueOrThrow({
          where: { id: failed.outreachMessageId! },
        });
        if (outreach.status === "SENDING") {
          await tx.outreachMessage.update({
            where: { id: outreach.id },
            data: {
              status: "NEEDS_REVIEW",
              failedAt: new Date(),
              lastError:
                "Inbox delivery was blocked or uncertain; owner review required.",
            },
          });
          if (outreach.emailDeliveryId)
            await tx.emailDelivery.update({
              where: { id: outreach.emailDeliveryId },
              data: {
                status: "FAILED",
                lastError:
                  "Inbox send requires owner review; automatic retry blocked.",
              },
            });
        }
      });
    throw error;
  }
}

export async function finishInboxOutreach(
  tx: Tx,
  outreachId: string,
  receivedAt: Date,
  rfc: string | null,
) {
  const message = await tx.outreachMessage.findUniqueOrThrow({
    where: { id: outreachId },
  });
  if (message.sentAt) return;
  const prospect = await tx.moverProspect.findUniqueOrThrow({
    where: { id: message.prospectId },
  });
  const config = await settings(tx);
  await tx.outreachMessage.update({
    where: { id: outreachId },
    data: { status: "SENT", sentAt: receivedAt, lastError: null },
  });
  if (message.emailDeliveryId)
    await tx.emailDelivery.update({
      where: { id: message.emailDeliveryId },
      data: {
        status: "SENT",
        sentAt: receivedAt,
        providerMessageId: rfc,
        lastError: null,
      },
    });
  const dueAt = new Date(receivedAt.getTime() + config.followUpDays * 86400000);
  await tx.moverProspect.update({
    where: { id: prospect.id },
    data: {
      lastContactedAt: receivedAt,
      nextFollowUpAt: config.autoTasks ? dueAt : null,
      status:
        prospect.status === "NOT_CONTACTED" ? "CONTACTED" : prospect.status,
      version: { increment: 1 },
    },
  });
  if (config.autoTasks)
    await tx.recruitmentTask.upsert({
      where: { dedupeKey: `follow-up:${outreachId}` },
      update: {},
      create: {
        dedupeKey: `follow-up:${outreachId}`,
        title: `Follow up with ${prospect.companyName}`,
        description:
          "Review response and contact permission. Another email requires explicit approval.",
        assignedAdminId: prospect.assignedAdminId,
        prospectId: prospect.id,
        conversationId: (
          await tx.partnerMessage.findUnique({
            where: { outreachMessageId: outreachId },
            select: { conversationId: true },
          })
        )?.conversationId,
        dueAt,
      },
    });
  await tx.recruitmentActivity.create({
    data: {
      prospectId: prospect.id,
      actorId: message.adminId,
      action: "email_sent",
      meta: { messageId: outreachId, provider: "Gmail" },
    },
  });
}

export async function reviewInboxSend(
  actor: InboxActor,
  id: string,
  note: string,
  connect = gmailConnection,
) {
  if (actor.role !== "OWNER" || note.trim().length < 20)
    fail("Owner review and a recorded check of Gmail Sent are required.", 403);
  const row = await locked(async (tx) => {
    await checkInboxActor(tx, actor, true);
    const message = await tx.partnerMessage.findUniqueOrThrow({
      where: { id },
    });
    await inboxConversation(tx, actor, message.conversationId);
    return message;
  });
  if (row.status !== "NEEDS_REVIEW" || !row.rfcMessageId)
    fail(
      "Only an uncertain send with a message identifier can be reviewed.",
      409,
    );
  const gmail = await connect();
  const found = await gmail.request<{ messages?: Array<{ id: string }> }>(
    `/messages?maxResults=10&q=${encodeURIComponent(`in:sent rfc822msgid:${row.rfcMessageId}`)}`,
  );
  if (found.messages?.length) {
    for (const item of found.messages)
      await persistGmailMessage(
        await gmail.request<GmailMessage>(
          `/messages/${encodeURIComponent(item.id)}?format=full`,
        ),
      );
    return { ok: true, foundSent: true };
  }
  return locked(async (tx) => {
    await checkInboxActor(tx, actor, true);
    const current = await tx.partnerMessage.findUniqueOrThrow({
      where: { id },
    });
    if (current.status !== "NEEDS_REVIEW")
      fail("Message changed during review. Reload.", 409);
    await tx.partnerMessage.update({
      where: { id },
      data: {
        status: "DRAFT",
        sendClaim: null,
        lastError: null,
        version: { increment: 1 },
      },
    });
    if (current.outreachMessageId)
      await tx.outreachMessage.update({
        where: { id: current.outreachMessageId },
        data: { status: "DRAFT", lastError: null },
      });
    await tx.partnerInboxActivity.create({
      data: {
        conversationId: row.conversationId,
        actorId: actor.id,
        action: "unsent_message_restored_after_owner_review",
        meta: { note: note.trim() },
      },
    });
    return { ok: true, foundSent: false };
  });
}

export async function syncInboxDrafts(
  gmail: Awaited<ReturnType<typeof gmailConnection>>,
  renew = async () => {},
) {
  const providerDrafts = await gmail.request<{
    drafts?: Array<{ id: string; message: { id: string } }>;
    nextPageToken?: string;
  }>(
    `/drafts?maxResults=50${gmail.mailbox.draftPageToken ? `&pageToken=${encodeURIComponent(gmail.mailbox.draftPageToken)}` : ""}`,
  );
  for (const draft of providerDrafts.drafts || []) {
    await renew();
    const metadata = await gmail.request<GmailMessage>(
      `/messages/${encodeURIComponent(draft.message.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Message-ID&metadataHeaders=In-Reply-To&metadataHeaders=References`,
    );
    if (
      !(await prisma.$transaction((tx) =>
        onboardingConversation(tx, metadata, draft.id),
      ))
    )
      continue;
    const existing = await prisma.partnerMessage.findUnique({
      where: { gmailDraftId: draft.id },
    });
    if (
      existing?.draftDirty ||
      existing?.status === "SENDING" ||
      existing?.status === "SENT"
    )
      continue;
    await persistGmailMessage(
      await gmail.request<GmailMessage>(
        `/messages/${encodeURIComponent(draft.message.id)}?format=full`,
      ),
      draft.id,
    );
  }
  await prisma.partnerMailbox.update({
    where: { id: "support" },
    data: { draftPageToken: providerDrafts.nextPageToken || null },
  });
  const drafts = await prisma.partnerMessage.findMany({
    where: {
      status: "DRAFT",
      draftDirty: true,
      conversation: { onboardingTracked: true },
    },
    orderBy: { updatedAt: "asc" },
    take: 5,
  });
  if (!drafts.length) return;
  for (const draft of drafts) {
    await renew();
    try {
      if (!draft.gmailDraftId && draft.draftMirrorUncertain) {
        await prisma.partnerMessage.updateMany({
          where: { id: draft.id, status: "DRAFT" },
          data: {
            lastError:
              "Draft mirror outcome is uncertain. Continue using the saved app draft; check Gmail Drafts before requesting a new mirror.",
          },
        });
        continue; // Provider listing above reconciles a successful but interrupted create by RFC Message-ID.
      }
      const built = await buildInboxMime(draft.id);
      const claimed = await locked((tx) =>
        tx.partnerMessage.updateMany({
          where: { id: draft.id, version: draft.version, status: "DRAFT" },
          data: {
            draftMirrorUncertain: !draft.gmailDraftId,
            draftMirrorUntil: new Date(Date.now() + 180000),
          },
        }),
      );
      if (!claimed.count) continue;
      const saved = await gmail.request<{
        id: string;
        message: { id: string };
      }>(
        draft.gmailDraftId
          ? `/drafts/${encodeURIComponent(draft.gmailDraftId)}`
          : "/drafts",
        draft.gmailDraftId ? "PUT" : "POST",
        {
          message: {
            raw: built.raw,
            ...(built.message.inReplyTo &&
            built.message.conversation.gmailThreadId
              ? { threadId: built.message.conversation.gmailThreadId }
              : {}),
          },
        },
      );
      // Always retain the returned provider ID even if the user edited while Gmail was responding.
      await prisma.partnerMessage.updateMany({
        where: { id: draft.id, status: "DRAFT" },
        data: {
          gmailDraftId: saved.id,
          gmailMessageId: saved.message.id,
          draftMirrorUncertain: false,
        },
      });
      await prisma.partnerMessage.updateMany({
        where: { id: draft.id, version: draft.version, status: "DRAFT" },
        data: { draftDirty: false, lastError: null },
      });
    } catch (error) {
      if (
        error instanceof InboxProviderError &&
        error.status === 404 &&
        draft.gmailDraftId
      )
        await prisma.partnerMessage.updateMany({
          where: { id: draft.id, status: "DRAFT" },
          data: {
            gmailDraftId: null,
            gmailMessageId: null,
            draftMirrorUncertain: false,
          },
        });
      else
        await prisma.partnerMessage.updateMany({
          where: { id: draft.id, status: "DRAFT" },
          data: {
            lastError:
              "Gmail draft mirroring is pending. The app draft is saved; sending always requires explicit approval.",
          },
        });
    } finally {
      await prisma.partnerMessage.updateMany({
        where: { id: draft.id },
        data: { draftMirrorUntil: null },
      });
    }
  }
}

// Bring the existing email station into the shared timeline without sending anything again.
export async function bridgeRecruitmentMessages() {
  const messages = await prisma.outreachMessage.findMany({
    where: {
      sentAt: { not: null },
      OR: [
        { inboxMessage: null },
        { inboxMessage: { status: { not: "SENT" } } },
      ],
    },
    include: { prospect: true },
    orderBy: { sentAt: "desc" },
    take: 50,
  });
  for (const item of messages)
    await locked(async (tx) => {
      const rfc = item.emailDeliveryId
        ? (
            await tx.emailDelivery.findUnique({
              where: { id: item.emailDeliveryId },
              select: { providerMessageId: true },
            })
          )?.providerMessageId || null
        : null;
      const paired = await tx.partnerMessage.findUnique({
        where: { outreachMessageId: item.id },
      });
      if (paired) {
        await tx.partnerConversation.update({
          where: { id: paired.conversationId },
          data: { onboardingTracked: true },
        });
        if (paired.status === "SENT") return;
        await tx.partnerMessage.update({
          where: { id: paired.id },
          data: {
            status: "SENT",
            sentAt: item.sentAt,
            receivedAt: item.sentAt!,
            rfcMessageId: rfc || paired.rfcMessageId,
            text: item.text,
            html: item.html,
            draftDirty: false,
            lastError: null,
            version: { increment: 1 },
          },
        });
        await tx.partnerConversation.updateMany({
          where: {
            id: paired.conversationId,
            lastMessageAt: { lte: item.sentAt! },
          },
          data: {
            lastMessageAt: item.sentAt!,
            preview: item.text.slice(0, 250),
            waitingFor: "PARTNER",
          },
        });
        await inboxActivity(
          tx,
          paired.conversationId,
          item.adminId,
          "existing_email_station_send_synced",
        );
        return;
      }
      const matched = rfc
        ? await tx.partnerMessage.findFirst({
            where: {
              rfcMessageId: rfc,
              direction: "OUTBOUND",
              from: SUPPORT_MAILBOX,
              to: { has: item.prospect.email || "" },
              outreachMessageId: null,
            },
          })
        : null;
      if (matched) {
        await tx.partnerMessage.update({
          where: { id: matched.id },
          data: { outreachMessageId: item.id, authorId: item.adminId },
        });
        await tx.partnerConversation.update({
          where: { id: matched.conversationId },
          data: {
            onboardingTracked: true,
            prospectId: item.prospectId,
            moverCompanyId: item.prospect.moverCompanyId,
            assignedAdminId: item.prospect.assignedAdminId,
          },
        });
        return;
      }
      const conversation = await tx.partnerConversation.create({
        data: {
          onboardingTracked: true,
          subject: item.subject,
          preview: item.text.slice(0, 250),
          participants: [
            SUPPORT_MAILBOX,
            ...(item.prospect.email ? [item.prospect.email] : []),
          ],
          prospectId: item.prospectId,
          moverCompanyId: item.prospect.moverCompanyId,
          assignedAdminId: item.prospect.assignedAdminId,
          archived: true,
          unread: false,
          waitingFor: "PARTNER",
          lastMessageAt: item.sentAt!,
        },
      });
      await tx.partnerMessage.create({
        data: {
          conversationId: conversation.id,
          outreachMessageId: item.id,
          authorId: item.adminId,
          rfcMessageId: rfc,
          direction: "OUTBOUND",
          status: "SENT",
          from: SUPPORT_MAILBOX,
          to: item.prospect.email ? [item.prospect.email] : [],
          cc: [],
          bcc: [],
          subject: item.subject,
          text: item.text,
          html: item.html,
          references: [],
          providerLabels: ["SENT"],
          sentAt: item.sentAt!,
          receivedAt: item.sentAt!,
        },
      });
    });
}
