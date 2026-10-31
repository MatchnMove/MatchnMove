import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  inboxActor,
  inboxScope,
  inboxConversation,
  checkInboxActor,
  inboxActivity,
} from "@/lib/partner-inbox-access";
import { inboxOAuthConfigured } from "@/lib/partner-inbox-google";
import {
  boundedInboxInput,
  SUPPORT_MAILBOX,
  sealInboxSecret,
} from "@/lib/partner-inbox-policy";
import {
  reviewInboxSend,
  saveInboxDraft,
  sendInboxDraft,
} from "@/lib/partner-inbox-outgoing";
import { syncPartnerInbox } from "@/lib/partner-inbox-sync";
import {
  activity,
  audit,
  fail,
  locked,
  ownerOnly,
  ownedProspect,
  RecruitmentError,
  setProspectStatus,
} from "@/lib/recruitment";
import { manualStatuses } from "@/lib/recruitment-stages";
import { isAdminUser, isAnyAdminUser } from "@/lib/admin-auth";
import { isRecruitmentMutationRequest } from "@/lib/recruitment-request";
import { validBusinessPhone } from "@/lib/prospect-contacts";
import { rateLimit } from "@/lib/rate-limit";
import {
  aucklandWeekStart,
  recruitmentDateRange,
} from "@/lib/recruitment-dates";

const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};
const companySelect = {
  id: true,
  companyName: true,
  email: true,
  phone: true,
  contactName: true,
  status: true,
  assignedAdminId: true,
  moverCompanyId: true,
  version: true,
  consentBasis: true,
} as const;
const attachmentSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  scanStatus: true,
} as const;
const personSelect = { id: true, name: true, email: true } as const;
function errorResponse(error: unknown) {
  if (error instanceof RecruitmentError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid inbox input." },
      { status: 400, headers },
    );
  console.error(
    "Partner inbox operation failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    {
      error:
        "Inbox operation could not be completed. Check mailbox setup or retry shortly.",
    },
    { status: 503, headers },
  );
}
export async function GET(req: NextRequest) {
  try {
    const actor = await inboxActor();
    const query = req.nextUrl.searchParams;
    const view = query.get("view") || "list";
    const scope = inboxScope(actor);
    const page = Math.max(
      1,
      Math.min(10000, Math.floor(Number(query.get("page")) || 1)),
    );
    let result: unknown;
    if (view === "badge") {
      result = {
        unread: await prisma.partnerConversation.count({
          where: { ...scope, unread: true, spam: false },
        }),
        assignments: await prisma.partnerConversation.findMany({
          where: {
            ...scope,
            assignedAdminId: actor.id,
            assignedAt: { not: null },
          },
          orderBy: { assignedAt: "desc" },
          take: 1,
          select: { id: true, assignedAt: true, subject: true },
        }),
      };
    } else if (view === "summary") {
      const today = recruitmentDateRange("1");
      const [
        mailbox,
        unread,
        waitingTeam,
        waitingPartner,
        recent,
        due,
        overdue,
        resolved,
      ] = await Promise.all([
        prisma.partnerMailbox.findUnique({
          where: { id: "support" },
          select: {
            address: true,
            connectedAt: true,
            lastSyncedAt: true,
            lastError: true,
            initialSyncComplete: true,
            encryptedRefreshToken: true,
          },
        }),
        prisma.partnerConversation.count({
          where: { ...scope, unread: true, spam: false },
        }),
        prisma.partnerConversation.count({
          where: {
            ...scope,
            waitingFor: "TEAM",
            messages: { some: { status: { in: ["SENT", "SYNCED"] } } },
            status: { not: "RESOLVED" },
            spam: false,
          },
        }),
        prisma.partnerConversation.count({
          where: {
            ...scope,
            waitingFor: "PARTNER",
            messages: { some: { status: { in: ["SENT", "SYNCED"] } } },
            status: { not: "RESOLVED" },
            spam: false,
          },
        }),
        prisma.partnerConversation.findMany({
          where: { ...scope, spam: false },
          orderBy: { lastMessageAt: "desc" },
          take: 5,
          select: {
            id: true,
            subject: true,
            lastMessageAt: true,
            unread: true,
            assignedAdminId: true,
          },
        }),
        prisma.recruitmentTask.count({
          where: {
            conversationId: { not: null },
            conversation: scope,
            completedAt: null,
            cancelledAt: null,
            dueAt: { gte: new Date(today.start), lte: new Date(today.end) },
          },
        }),
        prisma.recruitmentTask.count({
          where: {
            conversationId: { not: null },
            conversation: scope,
            completedAt: null,
            cancelledAt: null,
            dueAt: { lt: new Date() },
          },
        }),
        prisma.partnerConversation.count({
          where: { ...scope, resolvedAt: { gte: aucklandWeekStart() } },
        }),
      ]);
      const incoming = await prisma.partnerMessage.aggregate({
        where: {
          direction: "INBOUND",
          status: { not: "DELETED" },
          conversation: scope,
        },
        _max: { receivedAt: true },
      });
      result = {
        actor,
        configured: await inboxOAuthConfigured(),
        attachmentScanningConfigured: Boolean(process.env.MALWARE_SCAN_URL),
        latestIncomingAt: incoming._max.receivedAt,
        mailbox: mailbox
          ? {
              address: mailbox.address,
              connectedAt: mailbox.connectedAt,
              lastSyncedAt: mailbox.lastSyncedAt,
              lastError: mailbox.lastError,
              initialSyncComplete: mailbox.initialSyncComplete,
              connected: Boolean(mailbox.encryptedRefreshToken),
            }
          : { address: SUPPORT_MAILBOX, connected: false },
        unread,
        waitingTeam,
        waitingPartner,
        recent,
        due,
        overdue,
        resolved,
      };
    } else if (view === "conversation") {
      const conversation = await prisma.partnerConversation.findFirst({
        where: { id: query.get("id") || "", ...scope },
        include: {
          prospect: { select: companySelect },
          assignedAdmin: { select: personSelect },
          notes: {
            include: { author: { select: personSelect } },
            orderBy: { createdAt: "asc" },
            take: 100,
          },
          tasks: {
            include: { assignedAdmin: { select: personSelect } },
            orderBy: { dueAt: "asc" },
            take: 100,
          },
          activities: { orderBy: { createdAt: "desc" }, take: 100 },
        },
      });
      if (!conversation) fail("Conversation not found.", 404);
      const [messages, count, mover, communicationHistory] = await Promise.all([
        prisma.partnerMessage.findMany({
          where: { conversationId: conversation.id },
          select: {
            id: true,
            conversationId: true,
            inReplyTo: true,
            parentMessageId: true,
            composeText: true,
            from: true,
            replyTo: true,
            to: true,
            cc: true,
            bcc: true,
            subject: true,
            text: true,
            html: true,
            direction: true,
            status: true,
            version: true,
            receivedAt: true,
            sentAt: true,
            authorId: true,
            purpose: true,
            serviceReason: true,
            lastError: true,
            attachments: { select: attachmentSelect },
            author: { select: personSelect },
          },
          orderBy: { receivedAt: "desc" },
          take: 30,
          skip: (page - 1) * 30,
        }),
        prisma.partnerMessage.count({
          where: { conversationId: conversation.id },
        }),
        conversation.moverCompanyId
          ? prisma.moverCompany.findUnique({
              where: { id: conversation.moverCompanyId },
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                phone: true,
                status: true,
                user: { select: { email: true, emailVerifiedAt: true } },
              },
            })
          : null,
        conversation.prospectId
          ? prisma.outreachMessage.findMany({
              where: { prospectId: conversation.prospectId },
              select: { id: true, subject: true, status: true, sentAt: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            })
          : [],
      ]);
      const companyHistory =
        conversation.prospectId || conversation.moverCompanyId
          ? await prisma.partnerConversation.findMany({
              where: {
                ...scope,
                id: { not: conversation.id },
                OR: [
                  ...(conversation.prospectId
                    ? [{ prospectId: conversation.prospectId }]
                    : []),
                  ...(conversation.moverCompanyId
                    ? [{ moverCompanyId: conversation.moverCompanyId }]
                    : []),
                ],
              },
              select: {
                id: true,
                subject: true,
                lastMessageAt: true,
                status: true,
              },
              orderBy: { lastMessageAt: "desc" },
              take: 30,
            })
          : [];
      result = {
        ...conversation,
        companyHistory,
        messages: messages.reverse(),
        messageCount: count,
        page,
        mover,
        communicationHistory,
      };
    } else if (view === "access") {
      ownerOnly(actor);
      result = (
        await prisma.user.findMany({
          where: {
            adminDisabledAt: null,
            OR: [{ role: "ADMIN" }, { adminRole: { not: null } }],
          },
          select: {
            ...personSelect,
            canAccessPartnerInbox: true,
            canSendPartnerInbox: true,
            adminRole: true,
            role: true,
          },
          orderBy: { name: "asc" },
        })
      ).map((person) => ({ ...person, owner: isAdminUser(person) }));
    } else if (view === "team") {
      result = await prisma.user.findMany({
        where: {
          adminDisabledAt: null,
          OR: [
            { canAccessPartnerInbox: true },
            { role: "ADMIN", adminRole: { not: "RECRUITMENT_ADMIN" } },
            { adminRole: "OWNER" },
            { role: "ADMIN", adminRole: null },
          ],
        },
        select: {
          ...personSelect,
          canAccessPartnerInbox: true,
          canSendPartnerInbox: true,
          adminRole: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });
    } else if (view === "companies") {
      const q = (query.get("q") || "").slice(0, 100);
      result = {
        prospects: await prisma.moverProspect.findMany({
          where: {
            ...(actor.role === "OWNER" ? {} : { assignedAdminId: actor.id }),
            ...(q
              ? {
                  OR: [
                    { companyName: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          select: companySelect,
          take: 50,
          orderBy: { companyName: "asc" },
        }),
        movers:
          actor.role === "OWNER"
            ? await prisma.moverCompany.findMany({
                where: { companyName: { contains: q, mode: "insensitive" } },
                select: { id: true, companyName: true, phone: true },
                take: 50,
              })
            : [],
      };
    } else if (view === "tasks") {
      const status = query.get("status") || "outstanding";
      result = await prisma.recruitmentTask.findMany({
        where: {
          conversation: scope,
          conversationId: { not: null },
          ...(status === "completed"
            ? { completedAt: { not: null } }
            : { completedAt: null, cancelledAt: null }),
          ...(status === "overdue" ? { dueAt: { lt: new Date() } } : {}),
        },
        include: {
          conversation: { select: { id: true, subject: true } },
          prospect: { select: { companyName: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 50,
        skip: (page - 1) * 50,
      });
    } else {
      const folder = query.get("folder") || "inbox";
      const q = (query.get("q") || "").slice(0, 200);
      const pipeline = query.get("stage");
      const filter: Prisma.PartnerConversationWhereInput = {
        ...scope,
        ...(q
          ? {
              OR: [
                { subject: { contains: q, mode: "insensitive" } },
                { preview: { contains: q, mode: "insensitive" } },
                { participants: { has: q.toLowerCase() } },
                {
                  messages: {
                    some: { from: { contains: q, mode: "insensitive" } },
                  },
                },
                {
                  moverCompany: {
                    companyName: { contains: q, mode: "insensitive" },
                  },
                },
                {
                  moverCompany: {
                    contactPerson: { contains: q, mode: "insensitive" },
                  },
                },
                {
                  prospect: {
                    companyName: { contains: q, mode: "insensitive" },
                  },
                },
                {
                  prospect: {
                    contactName: { contains: q, mode: "insensitive" },
                  },
                },
                {
                  messages: {
                    some: { text: { contains: q, mode: "insensitive" } },
                  },
                },
              ],
            }
          : {}),
        ...(pipeline
          ? {
              prospect: {
                status: z
                  .enum([
                    "NOT_CONTACTED",
                    "CONTACTED",
                    "FOLLOW_UP_REQUIRED",
                    "INTERESTED",
                    "REGISTRATION_STARTED",
                    "REGISTERED",
                    "ACTIVE_MOVER",
                    "NOT_INTERESTED",
                    "DO_NOT_CONTACT",
                  ])
                  .parse(pipeline),
              },
            }
          : {}),
        ...(actor.role === "OWNER" && query.get("assignee")
          ? { assignedAdminId: query.get("assignee")! }
          : {}),
        ...(folder === "unread"
          ? { unread: true, spam: false }
          : folder === "archived"
            ? { archived: true, spam: false }
            : folder === "spam"
              ? { spam: true }
              : folder === "assigned"
                ? { assignedAdminId: actor.id, spam: false }
                : folder === "sent"
                  ? {
                      messages: {
                        some: { direction: "OUTBOUND", status: "SENT" },
                      },
                    }
                  : folder === "drafts"
                    ? {
                        messages: {
                          some: { status: { in: ["DRAFT", "PROVIDER_DRAFT"] } },
                        },
                      }
                    : folder === "awaiting"
                      ? { waitingFor: "PARTNER", status: { not: "RESOLVED" } }
                      : folder === "overdue"
                        ? {
                            tasks: {
                              some: {
                                completedAt: null,
                                cancelledAt: null,
                                dueAt: { lt: new Date() },
                              },
                            },
                          }
                        : folder === "all"
                          ? {}
                          : { archived: false, spam: false }),
        ...(query.get("status")
          ? {
              status: z
                .enum(["OPEN", "PENDING", "RESOLVED"])
                .parse(query.get("status")),
            }
          : {}),
        ...(query.get("label")
          ? {
              labels: {
                has: z
                  .enum([
                    "PRICING_REQUESTED",
                    "REGISTRATION_SENT",
                    "NEEDS_PHONE_CALL",
                    "FOLLOW_UP_REQUIRED",
                    "INFORMATION_REQUESTED",
                    "AWAITING_REGISTRATION",
                  ])
                  .parse(query.get("label")),
              },
            }
          : {}),
      };
      const [items, count] = await Promise.all([
        prisma.partnerConversation.findMany({
          where: filter,
          include: {
            prospect: { select: companySelect },
            assignedAdmin: { select: personSelect },
          },
          orderBy: { lastMessageAt: "desc" },
          take: 30,
          skip: (page - 1) * 30,
        }),
        prisma.partnerConversation.count({ where: filter }),
      ]);
      result = { items, count, page };
    }
    return NextResponse.json(result, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRecruitmentMutationRequest(req, 450000))
      fail("Invalid inbox request origin or content.", 403);
    const actor = await inboxActor();
    if (!rateLimit(`partner-inbox:${actor.id}`, 60).allowed)
      fail("Please slow down.", 429);
    const reader = req.body?.getReader();
    if (!reader) fail("Empty request.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 450000) {
        await reader.cancel();
        fail("Request too large.", 413);
      }
      chunks.push(part.value);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      fail("Invalid JSON request.");
    }
    if (!boundedInboxInput(parsed))
      fail("Request has too many items or nesting levels.", 413);
    const body = z
      .object({ action: z.string(), data: z.unknown() })
      .parse(parsed);
    if (body.action === "draft")
      return NextResponse.json(await saveInboxDraft(actor, body.data), {
        headers,
      });
    if (body.action === "send") {
      const input = z
        .object({
          id: z.string(),
          version: z.number().int(),
          confirmed: z.literal(true),
        })
        .parse(body.data);
      return NextResponse.json(
        await sendInboxDraft(actor, input.id, input.version),
        { headers },
      );
    }
    if (body.action === "sync") {
      ownerOnly(actor);
      return NextResponse.json(await syncPartnerInbox(true), { headers });
    }
    if (body.action === "review_send") {
      ownerOnly(actor);
      const input = z
        .object({
          id: z.string(),
          note: z.string().trim().min(20).max(2000),
          confirmedNotSent: z.literal(true),
        })
        .parse(body.data);
      return NextResponse.json(
        await reviewInboxSend(actor, input.id, input.note),
        { headers },
      );
    }
    const result = await locked(async (tx) => {
      await checkInboxActor(tx, actor);
      if (body.action === "configure") {
        ownerOnly(actor);
        const input = z
          .object({
            clientId: z
              .string()
              .trim()
              .min(10)
              .max(500)
              .endsWith(".apps.googleusercontent.com"),
            clientSecret: z.string().trim().min(10).max(1000),
          })
          .parse(body.data);
        const encryptedClientConfig = sealInboxSecret(JSON.stringify(input));
        await tx.partnerMailbox.upsert({
          where: { id: "support" },
          create: {
            id: "support",
            address: SUPPORT_MAILBOX,
            encryptedClientConfig,
          },
          update: {
            encryptedClientConfig,
            encryptedRefreshToken: null,
            connectedAt: null,
            leaseOwner: null,
            leaseUntil: null,
          },
        });
        await audit(tx, actor.id, "partner_inbox_oauth_configured", {
          provider: "Google Workspace",
        });
        return { ok: true };
      }
      if (body.action === "access") {
        ownerOnly(actor);
        const input = z
          .object({
            userId: z.string(),
            canAccess: z.boolean(),
            canSend: z.boolean(),
          })
          .parse(body.data);
        if (input.userId === actor.id)
          fail("Use another team member for permission changes.");
        const user = await tx.user.findUnique({ where: { id: input.userId } });
        if (
          !user ||
          user.adminDisabledAt ||
          (user.role !== "ADMIN" && !user.adminRole)
        )
          fail("Active team member not found.");
        if (isAdminUser({ ...user }))
          fail("Owners retain inbox access under the existing owner role.");
        await tx.user.update({
          where: { id: user.id },
          data: {
            canAccessPartnerInbox: input.canAccess,
            canSendPartnerInbox: input.canAccess && input.canSend,
            sessionVersion: { increment: 1 },
          },
        });
        await audit(tx, actor.id, "partner_inbox_access_changed", input);
        return { ok: true };
      }
      if (body.action === "disconnect") {
        ownerOnly(actor);
        await tx.partnerMailbox.updateMany({
          where: { id: "support" },
          data: {
            encryptedRefreshToken: null,
            leaseOwner: null,
            leaseUntil: null,
            connectedAt: null,
          },
        });
        await audit(tx, actor.id, "partner_inbox_disconnected", {});
        return { ok: true };
      }
      if (body.action === "complete_task") {
        const input = z.object({ id: z.string() }).parse(body.data);
        const task = await tx.recruitmentTask.findUnique({
          where: { id: input.id },
        });
        if (!task?.conversationId) fail("Inbox task not found.", 404);
        if (task.cancelledAt) fail("This task was cancelled.", 409);
        await inboxConversation(tx, actor, task.conversationId);
        await tx.recruitmentTask.update({
          where: { id: task.id },
          data: { completedAt: task.completedAt || new Date() },
        });
        await inboxActivity(
          tx,
          task.conversationId,
          actor.id,
          "followup_completed",
        );
        return { ok: true };
      }
      const target = z
        .object({ id: z.string() })
        .passthrough()
        .parse(body.data);
      const conversation = await inboxConversation(tx, actor, target.id);
      if (
        body.action === "adopt_draft" ||
        body.action === "remove_attachment"
      ) {
        await checkInboxActor(tx, actor, true);
        const input = z
          .object({
            messageId: z.string(),
            version: z.number().int(),
            attachmentId: z.string().optional(),
          })
          .parse(body.data);
        const draft = await tx.partnerMessage.findFirst({
          where: {
            id: input.messageId,
            conversationId: conversation.id,
            version: input.version,
          },
        });
        if (!draft) fail("Draft changed. Reload.", 409);
        if (body.action === "adopt_draft") {
          if (draft.status !== "PROVIDER_DRAFT")
            fail("This Gmail draft is already being edited.", 409);
          const result = await tx.partnerMessage.update({
            where: { id: draft.id },
            data: {
              status: "DRAFT",
              purpose: "SERVICE",
              authorId: actor.id,
              composeText: draft.text,
              html: null,
              version: { increment: 1 },
            },
          });
          await inboxActivity(
            tx,
            conversation.id,
            actor.id,
            "gmail_draft_adopted",
          );
          return result;
        }
        if (
          draft.status !== "DRAFT" ||
          (draft.authorId !== actor.id && actor.role !== "OWNER")
        )
          fail("Only an editable draft can lose an attachment.", 403);
        const attachment = await tx.partnerAttachment.findFirst({
          where: { id: input.attachmentId || "", messageId: draft.id },
        });
        if (!attachment) fail("Attachment not found.", 404);
        // Storage can be shared by an explicitly forwarded attachment. Retain the private object.
        await tx.partnerAttachment.delete({ where: { id: attachment.id } });
        await tx.partnerMessage.update({
          where: { id: draft.id },
          data: { draftDirty: true, version: { increment: 1 } },
        });
        await inboxActivity(
          tx,
          conversation.id,
          actor.id,
          "draft_attachment_removed",
        );
        return { ok: true };
      }
      if (body.action === "note") {
        const input = z
          .object({ text: z.string().trim().min(1).max(10000) })
          .parse(body.data);
        await tx.partnerInboxNote.create({
          data: {
            conversationId: conversation.id,
            authorId: actor.id,
            text: input.text,
          },
        });
        await inboxActivity(
          tx,
          conversation.id,
          actor.id,
          "internal_note_added",
        );
        return { ok: true };
      }
      if (body.action === "lease") {
        if (
          conversation.draftOwnerId &&
          conversation.draftOwnerId !== actor.id &&
          conversation.draftLeaseUntil &&
          conversation.draftLeaseUntil > new Date()
        )
          fail("Another team member is drafting.", 409);
        await tx.partnerConversation.update({
          where: { id: conversation.id },
          data: {
            draftOwnerId: actor.id,
            draftLeaseUntil: new Date(Date.now() + 90000),
          },
        });
        return { ok: true };
      }
      if (body.action === "stage") {
        const input = z
          .object({ stage: z.enum(manualStatuses), version: z.number().int() })
          .parse(body.data);
        if (!conversation.prospectId)
          fail(
            "Link a prospective company before changing its pipeline stage.",
          );
        await setProspectStatus(
          tx,
          actor,
          conversation.prospectId,
          input.stage,
          input.version,
        );
        await inboxActivity(
          tx,
          conversation.id,
          actor.id,
          "company_stage_updated",
        );
        return { ok: true };
      }
      if (body.action === "task") {
        const input = z
          .object({
            title: z.string().trim().min(3).max(200),
            description: z.string().max(2000).default(""),
            dueAt: z.string().datetime(),
            priority: z.enum(["LOW", "NORMAL", "HIGH"]),
            kind: z.enum([
              "CALL",
              "RESEARCH",
              "FOLLOW_UP",
              "REGISTRATION",
              "PRICING",
            ]),
            assignedAdminId: z.string().optional(),
          })
          .parse(body.data);
        const assignee =
          input.assignedAdminId || conversation.assignedAdminId || actor.id;
        if (assignee !== actor.id) ownerOnly(actor);
        const user = await tx.user.findUnique({ where: { id: assignee } });
        if (
          !user ||
          !isAnyAdminUser(user) ||
          (!isAdminUser({ ...user }) && !user.canAccessPartnerInbox)
        )
          fail("Choose an inbox-enabled team member.");
        const company = conversation.prospectId
          ? await tx.moverProspect.findUnique({
              where: { id: conversation.prospectId },
            })
          : null;
        const mover = conversation.moverCompanyId
          ? await tx.moverCompany.findUnique({
              where: { id: conversation.moverCompanyId },
              select: { phone: true },
            })
          : null;
        if (
          input.kind === "CALL" &&
          !validBusinessPhone(company?.phone || mover?.phone)
        )
          fail(
            "No suitable phone is recorded. Create a contact research task instead.",
          );
        if (assignee !== conversation.assignedAdminId) {
          await tx.partnerConversation.update({
            where: { id: conversation.id },
            data: {
              assignedAdminId: assignee,
              assignedAt: new Date(),
              version: { increment: 1 },
            },
          });
          await tx.recruitmentTask.updateMany({
            where: {
              conversationId: conversation.id,
              completedAt: null,
              cancelledAt: null,
            },
            data: { assignedAdminId: assignee },
          });
          await inboxActivity(
            tx,
            conversation.id,
            actor.id,
            "conversation_assigned_with_followup",
          );
        }
        const task = await tx.recruitmentTask.create({
          data: {
            title: input.title,
            description: input.description,
            kind: input.kind,
            dueAt: new Date(input.dueAt),
            priority: input.priority,
            assignedAdminId: assignee,
            conversationId: conversation.id,
            prospectId: conversation.prospectId,
          },
        });
        await inboxActivity(tx, conversation.id, actor.id, "followup_created");
        return task;
      }
      if (body.action === "link") {
        const input = z
          .object({
            prospectId: z.string().nullable(),
            moverCompanyId: z.string().nullable(),
            verifiedEmail: z.string().email().optional(),
          })
          .parse(body.data);
        if (input.prospectId) await ownedProspect(tx, actor, input.prospectId);
        if (input.moverCompanyId) {
          ownerOnly(actor);
          if (
            !(await tx.moverCompany.count({
              where: { id: input.moverCompanyId },
            }))
          )
            fail("Moving company not found.");
        }
        await tx.partnerConversation.update({
          where: { id: conversation.id },
          data: {
            prospectId: input.prospectId,
            moverCompanyId: input.moverCompanyId,
            linkReviewed: true,
            version: { increment: 1 },
          },
        });
        if (input.verifiedEmail) {
          ownerOnly(actor);
          if (!input.prospectId && !input.moverCompanyId)
            fail("Choose a company for the association.");
          const email = input.verifiedEmail.toLowerCase();
          if (
            !conversation.participants.includes(email) ||
            email === SUPPORT_MAILBOX
          )
            fail("Verify an external participant from this conversation.");
          const existing = await tx.partnerContactAssociation.findUnique({
            where: { email },
          });
          if (
            existing &&
            (existing.prospectId !== input.prospectId ||
              existing.moverCompanyId !== input.moverCompanyId)
          )
            fail(
              "This address is associated with another company. Review it before changing the association.",
              409,
            );
          await tx.partnerContactAssociation.upsert({
            where: { email },
            create: {
              email,
              prospectId: input.prospectId,
              moverCompanyId: input.moverCompanyId,
              conversationId: conversation.id,
              verifiedBy: actor.id,
            },
            update: { verifiedBy: actor.id, verifiedAt: new Date() },
          });
        }
        await inboxActivity(
          tx,
          conversation.id,
          actor.id,
          "company_link_reviewed",
        );
        return { ok: true };
      }
      if (body.action === "update") {
        const input = z
          .object({
            version: z.number().int(),
            status: z.enum(["OPEN", "PENDING", "RESOLVED"]).optional(),
            waitingFor: z.enum(["TEAM", "PARTNER"]).optional(),
            unread: z.boolean().optional(),
            archived: z.boolean().optional(),
            spam: z.boolean().optional(),
            assignedAdminId: z.string().nullable().optional(),
            labels: z
              .array(
                z.enum([
                  "PRICING_REQUESTED",
                  "REGISTRATION_SENT",
                  "NEEDS_PHONE_CALL",
                  "FOLLOW_UP_REQUIRED",
                  "INFORMATION_REQUESTED",
                  "AWAITING_REGISTRATION",
                ]),
              )
              .max(6)
              .optional(),
          })
          .parse(body.data);
        if (conversation.version !== input.version)
          fail("Conversation changed. Reload before saving.", 409);
        if (input.assignedAdminId !== undefined) {
          ownerOnly(actor);
          if (input.assignedAdminId) {
            const user = await tx.user.findUnique({
              where: { id: input.assignedAdminId },
            });
            if (
              !user ||
              !isAnyAdminUser(user) ||
              (!isAdminUser({ ...user }) && !user.canAccessPartnerInbox)
            )
              fail("Choose an inbox-enabled team member.");
          }
        }
        if (input.labels?.includes("NEEDS_PHONE_CALL")) {
          const company = conversation.prospectId
            ? await tx.moverProspect.findUnique({
                where: { id: conversation.prospectId },
                select: { phone: true },
              })
            : null;
          const mover = conversation.moverCompanyId
            ? await tx.moverCompany.findUnique({
                where: { id: conversation.moverCompanyId },
                select: { phone: true },
              })
            : null;
          if (!validBusinessPhone(company?.phone || mover?.phone))
            fail(
              "Record a suitable phone number before adding Needs phone call. Use a research follow-up meanwhile.",
            );
        }
        const changes: Record<string, boolean> =
          conversation.pendingProviderChanges &&
          typeof conversation.pendingProviderChanges === "object"
            ? (conversation.pendingProviderChanges as Record<string, boolean>)
            : {};
        for (const key of ["unread", "archived", "spam"] as const)
          if (input[key] !== undefined) changes[key] = input[key]!;
        const { version: ignoredVersion, ...data } = input;
        void ignoredVersion;
        await tx.partnerConversation.update({
          where: { id: conversation.id },
          data: {
            ...data,
            ...(input.assignedAdminId !== undefined &&
            input.assignedAdminId !== conversation.assignedAdminId
              ? { assignedAt: new Date() }
              : {}),
            ...(Object.keys(changes).length
              ? {
                  pendingProviderChanges: changes,
                  providerChangeNextAt: null,
                  providerChangeError: null,
                }
              : {}),
            version: { increment: 1 },
            ...(input.status
              ? { resolvedAt: input.status === "RESOLVED" ? new Date() : null }
              : {}),
          },
        });
        if (input.assignedAdminId)
          await tx.recruitmentTask.updateMany({
            where: {
              conversationId: conversation.id,
              completedAt: null,
              cancelledAt: null,
            },
            data: { assignedAdminId: input.assignedAdminId },
          });
        if (conversation.prospectId)
          await activity(
            tx,
            conversation.prospectId,
            actor.id,
            "inbox_conversation_updated",
            { conversationId: conversation.id },
          );
        await inboxActivity(
          tx,
          conversation.id,
          actor.id,
          "conversation_updated",
        );
        return { ok: true };
      }
      fail("Unknown inbox action.", 404);
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
