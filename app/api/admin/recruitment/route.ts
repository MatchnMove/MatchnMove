import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  activity,
  audit,
  checkActor,
  emailReady,
  fail,
  locked,
  ownedProspect,
  ownerOnly,
  prepareDraft,
  recruitmentActor,
  recruitmentSettingsSchema,
  RecruitmentError,
  saveProspect,
  suppressContact,
  setProspectStatus,
  settings,
  senderAddress,
  verifyRecruitmentSender,
} from "@/lib/recruitment";
import {
  manualStatuses,
  matchProspect,
  recruitmentLeadSelect,
  safeLeadSummary,
  scopeProspects,
  stoppedStatuses,
} from "@/lib/recruitment-policy";
import {
  approveAndSend,
  editDraft,
  syncRecruitmentOutcomes,
} from "@/lib/recruitment-outreach";
import {
  createTeamInvitation,
  dispatchTeamInvitation,
  teamList,
  updateTeamUser,
} from "@/lib/recruitment-team";
import {
  recruitmentMetrics,
  reportingRange,
} from "@/lib/recruitment-reporting";
import { rateLimit } from "@/lib/rate-limit";
import { isRecruitmentMutationRequest } from "@/lib/recruitment-request";
import { sendPasswordResetEmail } from "@/lib/mover-auth";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function errorResponse(error: unknown) {
  if (error instanceof RecruitmentError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid input" },
      { status: 400, headers },
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return NextResponse.json(
      { error: "A matching record already exists. Reload before continuing." },
      { status: 409, headers },
    );
  console.error(
    "Recruitment operation failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    {
      error:
        "Recruitment is unavailable. Check the database migration and server logs.",
    },
    { status: 503, headers },
  );
}

export async function GET(req: NextRequest) {
  try {
    const actor = await recruitmentActor();
    const query = req.nextUrl.searchParams;
    const view = query.get("view") || "dashboard";
    const scope = scopeProspects(actor);
    const page = Math.max(1, Math.min(10000, Number(query.get("page")) || 1));
    const q = (query.get("q") || "").slice(0, 100);
    let data: unknown;
    if (view === "dashboard") {
      const range = reportingRange(query.get("start"), query.get("end"));
      const [metrics, tasks, recent, team] = await Promise.all([
        recruitmentMetrics(actor, range),
        prisma.recruitmentTask.findMany({
          where: {
            ...(actor.role === "OWNER" ? {} : { assignedAdminId: actor.id }),
            completedAt: null,
            cancelledAt: null,
          },
          orderBy: [{ dueAt: "asc" }],
          take: 12,
        }),
        prisma.recruitmentActivity.findMany({
          where: { prospect: scope },
          include: { prospect: { select: { companyName: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        actor.role === "OWNER" ? teamList() : Promise.resolve([]),
      ]);
      const performance =
        actor.role === "OWNER"
          ? await Promise.all(
              team.map(async (user) => ({
                id: user.id,
                name: user.name || user.email,
                disabled: Boolean(user.adminDisabledAt),
                metrics: await recruitmentMetrics(
                  { ...actor, id: user.id, role: "RECRUITMENT_ADMIN" },
                  range,
                ),
              })),
            )
          : [];
      data = {
        actor,
        metrics,
        tasks,
        recent,
        performance,
        activeAdmins: team.filter(
          (user) =>
            !user.adminDisabledAt && user.adminRole === "RECRUITMENT_ADMIN",
        ).length,
        recentLeads: actor.canViewLeads
          ? (
              await prisma.quoteRequest.findMany({
                where:
                  actor.role === "OWNER"
                    ? {}
                    : {
                        recruitmentSharingAllowed: true,
                        sharingConsentAt: { not: null },
                      },
                select: {
                  ...recruitmentLeadSelect,
                  recruitmentSharingAllowed: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
              })
            ).map((lead) => ({
              ...safeLeadSummary(lead),
              invitationAllowed: lead.recruitmentSharingAllowed,
            }))
          : [],
      };
    } else if (view === "prospects") {
      const status = query.get("status");
      const filter: Prisma.MoverProspectWhereInput = {
        ...scope,
        ...(q
          ? {
              OR: [
                { companyName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status
          ? {
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
                .parse(status),
            }
          : {}),
      };
      const [items, count] = await Promise.all([
        prisma.moverProspect.findMany({
          where: filter,
          include: { assignedAdmin: { select: { id: true, name: true } } },
          orderBy:
            query.get("sort") === "name"
              ? { companyName: "asc" }
              : { updatedAt: "desc" },
          take: 50,
          skip: (page - 1) * 50,
        }),
        prisma.moverProspect.count({ where: filter }),
      ]);
      data = { items, count, page };
    } else if (view === "prospect") {
      const prospect = await prisma.moverProspect.findFirst({
        where: { id: query.get("id") || "", ...scope },
        include: {
          activities: { orderBy: { createdAt: "desc" }, take: 100 },
          messages: {
            where: actor.canViewLeads ? {} : { quoteRequestId: null },
            select: {
              id: true,
              subject: true,
              status: true,
              sentAt: true,
              failedAt: true,
              createdAt: true,
              lastError: true,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          },
          tasks: { orderBy: { dueAt: "asc" }, take: 100 },
        },
      });
      if (!prospect) fail("Company not found.", 404);
      data = prospect;
    } else if (view === "leads") {
      if (!actor.canViewLeads)
        fail("Lead summaries have not been authorised for your account.", 403);
      const [items, count] = await Promise.all([
        prisma.quoteRequest.findMany({
          where: {
            recruitmentSharingAllowed: true,
            sharingConsentAt: { not: null },
          },
          select: recruitmentLeadSelect,
          orderBy: { createdAt: "desc" },
          take: 50,
          skip: (page - 1) * 50,
        }),
        prisma.quoteRequest.count({
          where: {
            recruitmentSharingAllowed: true,
            sharingConsentAt: { not: null },
          },
        }),
      ]);
      data = { items: items.map(safeLeadSummary), count, page };
    } else if (view === "matches") {
      if (!actor.canViewLeads) fail("Lead access required.", 403);
      const quote = await prisma.quoteRequest.findFirst({
        where: {
          id: query.get("id") || "",
          recruitmentSharingAllowed: true,
          sharingConsentAt: { not: null },
        },
        select: recruitmentLeadSelect,
      });
      if (!quote) fail("Lead summary not found.", 404);
      const lead = safeLeadSummary(quote);
      const prospects = await prisma.moverProspect.findMany({
        where: {
          ...scope,
          status: {
            notIn: [
              "REGISTERED",
              "ACTIVE_MOVER",
              "NOT_INTERESTED",
              "DO_NOT_CONTACT",
            ],
          },
        },
        take: 500,
        orderBy: { companyName: "asc" },
      });
      const suppressions = new Set(
        (
          await prisma.contactSuppression.findMany({
            where: { email: { in: prospects.map((p) => p.email) } },
            select: { email: true },
          })
        ).map((s) => s.email),
      );
      data = {
        lead,
        items: prospects
          .filter((p) => !suppressions.has(p.email))
          .map((p) => ({ ...p, ...matchProspect(p, lead) }))
          .sort((a, b) => b.score - a.score),
        truncated: prospects.length === 500,
      };
    } else if (view === "messages") {
      const messageStatus = query.get("status") ? z.enum(["DRAFT", "SENT", "NEEDS_REVIEW", "CANCELLED", "SENDING"]).parse(query.get("status")) : undefined;
      const messageKind = query.get("kind") ? z.enum(["general", "lead"]).parse(query.get("kind")) : undefined;
      if (messageKind === "lead" && !actor.canViewLeads) fail("Lead summary access has not been authorised.", 403);
      data = await prisma.outreachMessage.findMany({
        where: {
          prospect: scope,
          ...(!actor.canViewLeads ? { quoteRequestId: null } : {}),
          ...(messageStatus ? { status: messageStatus } : {}),
          ...(messageKind === "general" ? { quoteRequestId: null } : messageKind === "lead" && actor.canViewLeads ? { quoteRequestId: { not: null } } : {}),
          ...(query.get("id") ? { id: query.get("id")! } : {}),
        },
        include: { prospect: { select: { companyName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: (page - 1) * 50,
      });
    } else if (view === "email_station") {
      const config = await settings();
      const messageScope = { prospect: scope, ...(!actor.canViewLeads ? { quoteRequestId: null } : {}) };
      const [drafts, sent, needsReview] = await Promise.all([
        prisma.outreachMessage.count({ where: { ...messageScope, status: "DRAFT" } }),
        prisma.outreachMessage.count({ where: { ...messageScope, status: "SENT" } }),
        prisma.outreachMessage.count({ where: { ...messageScope, status: "NEEDS_REVIEW" } }),
      ]);
      data = { template: config.generalIntroduction, senderIdentity: config.senderIdentity,
        sendingReady: config.sendingEnabled && await emailReady() && Boolean(config.senderIdentity.trim()),
        drafts, sent, needsReview };
    } else if (view === "tasks") {
      data = await prisma.recruitmentTask.findMany({
        where: {
          ...(actor.role === "OWNER" ? {} : { assignedAdminId: actor.id }),
          cancelledAt: null,
        },
        include: { prospect: { select: { companyName: true } } },
        orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
        take: 100,
      });
    } else if (view === "team") {
      ownerOnly(actor);
      data = {
        users: await teamList(),
        invitations: await prisma.adminInvitation.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            sentAt: true,
            expiresAt: true,
            acceptedAt: true,
            revokedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      };
    } else if (view === "settings") {
      ownerOnly(actor);
      data = { settings: await settings(), emailReady: await emailReady(), senderAddress: senderAddress() };
    } else fail("Unknown view.", 404);
    return NextResponse.json(data, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Exact origin required for every authenticated browser mutation, including JSON requests.
    if (!isRecruitmentMutationRequest(req))
      fail("Invalid request origin or content.", 403);
    const actor = await recruitmentActor();
    if (!rateLimit(`recruitment:${actor.id}`, 40).allowed)
      fail("Please slow down and try again shortly.", 429);
    const rawText = await req.text();
    if (rawText.length > 64000) fail("Request is too large.", 413);
    const body = z
      .object({ action: z.string().max(50), data: z.unknown() })
      .parse(JSON.parse(rawText));
    if (body.action === "send")
      return NextResponse.json(await approveAndSend(actor, body.data), {
        headers,
      });
    if (body.action === "verify_sender") {
      z.object({ confirmed: z.literal(true) }).parse(body.data);
      return NextResponse.json(await verifyRecruitmentSender(actor), { headers });
    }
    if (body.action === "send_invitation") {
      const input = z
        .object({ id: z.string(), confirmed: z.literal(true) })
        .parse(body.data);
      await locked((tx) => checkActor(tx, actor));
      return NextResponse.json(await dispatchTeamInvitation(actor, input.id), {
        headers,
      });
    }
    if (body.action === "sync") {
      ownerOnly(actor);
      return NextResponse.json(await syncRecruitmentOutcomes(), { headers });
    }
    if (body.action === "team_recovery") {
      ownerOnly(actor);
      const input = z
        .object({ id: z.string(), confirmed: z.literal(true) })
        .parse(body.data);
      if (!(await emailReady()))
        fail("Verify SMTP before sending account recovery email.", 503);
      const user = await locked(async (tx) => {
        await checkActor(tx, actor);
        const user = await tx.user.findFirst({
          where: {
            id: input.id,
            adminDisabledAt: null,
            OR: [{ adminRole: { not: null } }, { role: "ADMIN" }],
          },
        });
        if (!user) fail("Active team member not found.", 404);
        await tx.user.update({
          where: { id: user.id },
          data: { sessionVersion: { increment: 1 } },
        });
        await audit(tx, actor.id, "team_recovery_requested", {
          userId: user.id,
        });
        return user;
      });
      return NextResponse.json(await sendPasswordResetEmail(user), { headers });
    }
    const result = await locked(async (tx) => {
      await checkActor(tx, actor);
      if (body.action === "save_prospect") {
        const input = z
          .object({
            id: z.string().optional(),
            version: z.number().int().optional(),
            prospect: z.unknown(),
          })
          .parse(body.data);
        return saveProspect(tx, actor, input.prospect, input.id, input.version);
      }
      if (body.action === "status") {
        const input = z
          .object({
            id: z.string(),
            version: z.number().int(),
            status: z.enum(manualStatuses),
          })
          .parse(body.data);
        await setProspectStatus(
          tx,
          actor,
          input.id,
          input.status,
          input.version,
        );
        return { ok: true };
      }
      if (body.action === "reassign") {
        ownerOnly(actor);
        const input = z
          .object({
            id: z.string(),
            assignedAdminId: z.string(),
            version: z.number().int(),
          })
          .parse(body.data);
        const prospect = await ownedProspect(tx, actor, input.id);
        if (prospect.version !== input.version)
          fail("Assignment changed. Reload before reassigning.", 409);
        const admin = await tx.user.findFirst({
          where: {
            id: input.assignedAdminId,
            adminDisabledAt: null,
            OR: [{ adminRole: { not: null } }, { role: "ADMIN" }],
          },
        });
        if (!admin) fail("Choose an active team member.");
        await tx.moverProspect.update({
          where: { id: input.id },
          data: { assignedAdminId: admin.id, version: { increment: 1 } },
        });
        await tx.recruitmentTask.updateMany({
          where: { prospectId: input.id, completedAt: null, cancelledAt: null },
          data: { assignedAdminId: admin.id },
        });
        await activity(tx, input.id, actor.id, "prospect_reassigned", {
          from: prospect.assignedAdminId,
          to: admin.id,
        });
        await audit(tx, actor.id, "recruitment_reassigned", {
          prospectId: input.id,
          from: prospect.assignedAdminId,
          to: admin.id,
        });
        return { ok: true };
      }
      if (body.action === "prepare") {
        const input = z
          .object({
            prospectIds: z.array(z.string()).min(1).max(20),
            quoteRequestId: z.string(),
          })
          .parse(body.data);
        const messages = [];
        for (const id of [...new Set(input.prospectIds)])
          messages.push(
            await prepareDraft(tx, actor, id, input.quoteRequestId),
          );
        return { messages };
      }
      if (body.action === "prepare_general") {
        const input = z.object({ prospectId: z.string().min(1) }).parse(body.data);
        return prepareDraft(tx, actor, input.prospectId);
      }
      if (body.action === "edit_draft") return editDraft(tx, actor, body.data);
      if (body.action === "prepare_followup") {
        const input = z.object({ id: z.string() }).parse(body.data);
        const message = await tx.outreachMessage.findFirst({
          where: { id: input.id, prospect: scopeProspects(actor) },
        });
        if (!message) fail("Invitation not found.", 404);
        return prepareDraft(
          tx,
          actor,
          message.prospectId,
          message.quoteRequestId,
          message.id,
        );
      }
      if (body.action === "invite")
        return createTeamInvitation(tx, actor, body.data);
      if (body.action === "team_update") {
        await updateTeamUser(tx, actor, body.data);
        return { ok: true };
      }
      if (body.action === "revoke_invitation") {
        ownerOnly(actor);
        const input = z.object({ id: z.string() }).parse(body.data);
        await tx.adminInvitation.update({
          where: { id: input.id },
          data: { revokedAt: new Date(), tokenHash: null },
        });
        await audit(tx, actor.id, "team_invitation_revoked", {
          invitationId: input.id,
        });
        return { ok: true };
      }
      if (body.action === "settings") {
        ownerOnly(actor);
        const config = recruitmentSettingsSchema.parse(body.data);
        if (config.sendingEnabled && (!(await emailReady(tx)) || !config.senderIdentity))
          fail(
            "Verify SMTP and set a sender identity before enabling outreach.",
          );
        await tx.recruitmentSetting.upsert({
          where: { key: "outreach" },
          create: { key: "outreach", value: config },
          update: { value: config },
        });
        await audit(tx, actor.id, "recruitment_settings_changed", {
          sendingEnabled: config.sendingEnabled,
          dailyLimit: config.dailyLimit,
        });
        return { ok: true };
      }
      if (body.action === "withdraw_lead_permission") {
        ownerOnly(actor);
        const input = z.object({ id: z.string() }).parse(body.data);
        await tx.quoteRequest.update({
          where: { id: input.id },
          data: { recruitmentSharingAllowed: false },
        });
        await tx.outreachMessage.updateMany({
          where: { quoteRequestId: input.id, status: "DRAFT" },
          data: { status: "CANCELLED" },
        });
        await audit(tx, actor.id, "recruitment_lead_permission_withdrawn", {
          quoteRequestId: input.id,
        });
        return { ok: true };
      }
      if (body.action === "suppress_contact") {
        ownerOnly(actor);
        const input = z
          .object({
            email: z
              .string()
              .trim()
              .email()
              .transform((email) => email.toLowerCase()),
            reason: z.string().trim().min(3).max(500),
          })
          .parse(body.data);
        await suppressContact(
          tx,
          input.email,
          input.reason,
          "owner-review",
          actor.id,
        );
        await audit(tx, actor.id, "contact_suppression_added", {
          email: input.email,
          reason: input.reason,
        });
        return { ok: true };
      }
      if (body.action === "create_task") {
        const input = z
          .object({
            title: z.string().trim().min(3).max(200),
            description: z.string().max(2000).optional(),
            prospectId: z.string().optional(),
            assignedAdminId: z.string().optional(),
            dueAt: z.string().datetime(),
            priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
          })
          .parse(body.data);
        if (input.assignedAdminId && input.assignedAdminId !== actor.id)
          ownerOnly(actor);
        const assignee = input.assignedAdminId || actor.id;
        const user = await tx.user.findFirst({
          where: {
            id: assignee,
            adminDisabledAt: null,
            OR: [{ adminRole: { not: null } }, { role: "ADMIN" }],
          },
        });
        if (!user) fail("Choose an active team member.");
        if (input.prospectId) {
          const prospect = await ownedProspect(tx, actor, input.prospectId);
          if (prospect.assignedAdminId !== assignee)
            fail("Assign the task to the company's assigned admin.");
          if (stoppedStatuses.includes(prospect.status))
            fail("This recruitment is closed.");
        }
        const task = await tx.recruitmentTask.create({
          data: {
            ...input,
            assignedAdminId: assignee,
            dueAt: new Date(input.dueAt),
          },
        });
        if (input.prospectId)
          await activity(tx, input.prospectId, actor.id, "task_created", {
            taskId: task.id,
          });
        return task;
      }
      if (body.action === "complete_task") {
        const input = z.object({ id: z.string() }).parse(body.data);
        const task = await tx.recruitmentTask.findFirst({
          where: {
            id: input.id,
            ...(actor.role === "OWNER" ? {} : { assignedAdminId: actor.id }),
            cancelledAt: null,
          },
        });
        if (!task) fail("Task not found.", 404);
        if (task.completedAt) return { ok: true };
        await tx.recruitmentTask.update({
          where: { id: task.id },
          data: { completedAt: task.completedAt || new Date() },
        });
        if (task.prospectId) {
          await activity(tx, task.prospectId, actor.id, "task_completed", {
            taskId: task.id,
          });
          await tx.moverProspect.update({
            where: { id: task.prospectId },
            data: { nextFollowUpAt: null },
          });
        }
        return { ok: true };
      }
      fail("Unknown action.", 404);
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
