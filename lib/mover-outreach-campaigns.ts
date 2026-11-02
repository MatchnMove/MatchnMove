import { z } from "zod";
import type { MoverProspect, OutreachMessage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addAucklandCalendar, aucklandMidnight, aucklandParts } from "@/lib/recruitment-dates";
import { activity, baseUrl, cancelFollowUps, checkActor, fail, locked, ownedProspect, settings, type Tx } from "@/lib/recruitment";
import { contactBlockReason, secureToken, tokenHash, type RecruitmentActor, type SafeLead } from "@/lib/recruitment-policy";
import { MOVER_TEMPLATE_VERSION, moverEmailTemplates, moverTemplateKeys, renderMoverOutreachEmail, type MoverTemplateKey } from "@/lib/mover-outreach-templates";

export const openCampaignStatuses = ["DRAFT", "ACTIVE", "PAUSED", "REVIEW_DUE"];
const followupKeys: Record<number, MoverTemplateKey> = { 1: "MOVER_FOLLOWUP_1", 2: "MOVER_FOLLOWUP_2", 3: "MOVER_FINAL", 4: "MOVER_REENGAGEMENT" };

export function opportunityEligible(lead: { moveDate: Date | null; createdAt: Date; recruitmentSharingAllowed?: boolean; sharingConsentAt?: Date | null }, now = new Date()) {
  if (lead.recruitmentSharingAllowed === false || lead.sharingConsentAt === null) return false;
  const p = aucklandParts(now);
  const day = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return lead.moveDate ? lead.moveDate >= aucklandMidnight(day) : lead.createdAt >= new Date(now.getTime() - 30 * 86400000);
}

export function nextOutreachDate(sequenceSent: number, sentAt: Date) {
  return sequenceSent === 0 ? addAucklandCalendar(sentAt, { days: 7 })
    : sequenceSent === 1 ? addAucklandCalendar(sentAt, { days: 21 })
      : sequenceSent === 2 ? addAucklandCalendar(sentAt, { months: 1 }) : null;
}

export function mailboxAutomationBlock(mailbox: { address: string; encryptedRefreshToken: string | null; initialSyncComplete: boolean; initialPageToken?: string | null; lastSyncedAt: Date | null; lastError: string | null } | null, now = new Date()) {
  if (!mailbox?.encryptedRefreshToken || !mailbox.initialSyncComplete)
    return "Connect the monitored partner inbox and complete its initial sync before automatic follow-ups can run.";
  if (mailbox.lastError || !mailbox.lastSyncedAt || now.getTime() - mailbox.lastSyncedAt.getTime() > 120000)
    return "Automatic follow-ups are waiting for a successful, current inbox sync. Reply status is unknown.";
  if (mailbox.initialPageToken) return "Automatic follow-ups are waiting for the inbox to finish importing all pending reply pages.";
  return null;
}

async function eligibleProspect(tx: Tx, prospect: MoverProspect) {
  if (!prospect.email) fail("Record a valid company email before preparing outreach.");
  const blocked = contactBlockReason(prospect, Boolean(await tx.contactSuppression.findUnique({ where: { email: prospect.email } })));
  if (blocked) fail(blocked);
  if (prospect.businessType !== "MOVING") fail("The approved mover sequence is only available to moving companies.");
  if (prospect.respondedAt) fail("A response has been received. Review the conversation; automated outreach cannot restart.");
  if (await tx.outreachMessage.count({ where: { prospectId: prospect.id, status: "NEEDS_REVIEW" } })) fail("A previous delivery outcome needs review before any further outreach.");
  if (prospect.registeredAt || prospect.moverCompanyId || prospect.cleanerCompanyId) fail("This company has started registration. Outreach has stopped.");
  const account = await tx.user.findUnique({ where: { email: prospect.email }, select: { role: true } });
  if (account && ["MOVER", "CLEANER"].includes(account.role)) fail("An account already exists for this contact. Outreach has stopped.");
}

export async function prepareMoverCampaignDraft(
  tx: Tx, actor: RecruitmentActor, prospect: MoverProspect, lead: SafeLead | null,
  quoteRequestId: string | null, parentId?: string, startNew = false,
) {
  await eligibleProspect(tx, prospect);
  let campaign = await tx.outreachCampaign.findFirst({ where: { prospectId: prospect.id }, orderBy: { createdAt: "desc" } });
  if (parentId) {
    const parent = await tx.outreachMessage.findUnique({ where: { id: parentId } });
    if (!campaign || parent?.campaignId !== campaign.id || parent.status !== "SENT") fail("Choose a sent email in the current approved sequence.");
    if (campaign.status !== "ACTIVE" || campaign.nextSequence > 3) fail("No further automatic follow-up is available. Use the three-month review when due.");
    if (!campaign.nextDueAt || campaign.nextDueAt > new Date()) fail("The next follow-up is not due yet.");
    return prepareCampaignStep(tx, actor, campaign.id, campaign.nextSequence);
  }
  if (!campaign && !startNew) {
    // Existing outreach is never silently enrolled into automatic sending.
    const legacy = await tx.outreachMessage.findFirst({ where: { prospectId: prospect.id, campaignId: null }, orderBy: { createdAt: "desc" } });
    if (legacy) fail("This company has legacy outreach. Review its history and explicitly start a new sequence.", 409);
  }
  if (campaign && campaign.status !== "DRAFT") {
    if (!startNew || openCampaignStatuses.includes(campaign.status)) {
      const initial = await tx.outreachMessage.findFirst({ where: { campaignId: campaign.id, sequence: 0 } });
      if (initial) return initial;
      fail("Review the current sequence before starting another invitation.", 409);
    }
  }
  if (!campaign || (startNew && !openCampaignStatuses.includes(campaign.status))) {
    campaign = await tx.outreachCampaign.create({ data: { prospectId: prospect.id, createdById: actor.id } });
    await activity(tx, prospect.id, actor.id, "outreach_campaign_created", { campaignId: campaign.id, explicitNewSequence: startNew });
  }
  const existing = await tx.outreachMessage.findFirst({ where: { campaignId: campaign.id, sequence: 0 } });
  if (existing && existing.quoteRequestId === quoteRequestId && existing.attributionExpiresAt > new Date()) return existing;
  if (existing?.status === "SENDING" || existing?.sentAt) fail("The initial invitation has already been sent or claimed.", 409);
  const key: MoverTemplateKey = lead ? "MOVER_OPPORTUNITY" : "MOVER_GENERAL";
  const draft = campaignDraft(prospect, actor, campaign.id, 0, key, lead, quoteRequestId);
  return existing ? tx.outreachMessage.update({ where: { id: existing.id }, data: draft }) : tx.outreachMessage.create({ data: draft });
}

function campaignDraft(prospect: MoverProspect, actor: RecruitmentActor, campaignId: string, sequence: number, templateKey: MoverTemplateKey, lead: SafeLead | null, quoteRequestId: string | null, scheduledAt?: Date) {
  const registration = secureToken(), unsubscribe = secureToken();
  const rendered = renderMoverOutreachEmail({ templateKey, companyName: prospect.companyName, contactName: prospect.contactName, lead,
    registrationUrl: `${baseUrl()}/api/recruitment/attribution?token=${registration}`,
    unsubscribeUrl: `${baseUrl()}/recruitment/unsubscribe?token=${unsubscribe}` });
  return { ...rendered, campaignId, prospectId: prospect.id, adminId: actor.id, quoteRequestId, sequence, introduction: "", templateKey,
    templateVersion: MOVER_TEMPLATE_VERSION, scheduledAt, attributionHash: tokenHash(registration),
    attributionExpiresAt: addAucklandCalendar(new Date(), { months: 4 }), unsubscribeHash: tokenHash(unsubscribe) };
}

export async function prepareCampaignStep(tx: Tx, actor: RecruitmentActor, campaignId: string, sequence: number) {
  const campaign = await tx.outreachCampaign.findUniqueOrThrow({ where: { id: campaignId } });
  const prospect = await ownedProspect(tx, actor, campaign.prospectId);
  await eligibleProspect(tx, prospect);
  if (sequence !== campaign.nextSequence || !followupKeys[sequence]) fail("The campaign stage has changed. Reload the company record.", 409);
  if (sequence === 4 ? campaign.status !== "REVIEW_DUE" || !campaign.revisitAt || campaign.revisitAt > new Date()
    : campaign.status !== "ACTIVE" || !campaign.nextDueAt || campaign.nextDueAt > new Date()) fail("This email is not due or outreach is paused.");
  const existing = await tx.outreachMessage.findFirst({ where: { campaignId, sequence } });
  if (existing) return existing;
  const parent = await tx.outreachMessage.findFirst({ where: { campaignId, status: "SENT" }, orderBy: { sequence: "desc" } });
  if (!parent) fail("The initial invitation has not been sent.");
  return tx.outreachMessage.create({ data: { ...campaignDraft(prospect, actor, campaignId, sequence, followupKeys[sequence], null, null, sequence === 4 ? campaign.revisitAt! : campaign.nextDueAt!), followUpToId: parent.id } });
}

export async function verifyCampaignSend(tx: Tx, message: OutreachMessage, prospect: MoverProspect) {
  if (!message.campaignId) return;
  await eligibleProspect(tx, prospect);
  const campaign = await tx.outreachCampaign.findUniqueOrThrow({ where: { id: message.campaignId } });
  if (message.templateVersion !== MOVER_TEMPLATE_VERSION || !moverTemplateKeys.includes(message.templateKey as MoverTemplateKey)) fail("Refresh this draft to the current approved template before sending.", 409);
  if (message.sequence === 0) {
    if (campaign.status !== "DRAFT") fail("The initial invitation has already been sent or cancelled.", 409);
  } else {
    if (campaign.nextSequence !== message.sequence || (message.sequence === 4 ? campaign.status !== "REVIEW_DUE" : campaign.status !== "ACTIVE")) fail("The campaign is paused, stopped or at a different stage.", 409);
    const due = message.sequence === 4 ? campaign.revisitAt : campaign.nextDueAt;
    if (!due || due > new Date()) fail("This outreach stage is not due yet.");
  }
}

export async function recordCampaignSent(tx: Tx, message: OutreachMessage, sentAt: Date) {
  if (!message.campaignId) return;
  const campaign = await tx.outreachCampaign.findUniqueOrThrow({ where: { id: message.campaignId } });
  if (message.sequence === 0 && campaign.initialSentAt) return;
  if (message.sequence > 0 && campaign.nextSequence > message.sequence) return;
  const nextDueAt = nextOutreachDate(message.sequence, sentAt);
  const revisitAt = campaign.revisitAt || addAucklandCalendar(sentAt, { months: 3 });
  await tx.outreachCampaign.update({ where: { id: campaign.id }, data: {
    status: message.sequence === 4 ? "CLOSED" : ["PAUSED", "STOPPED", "CLOSED"].includes(campaign.status) ? campaign.status : "ACTIVE",
    initialSentAt: campaign.initialSentAt || sentAt, lastSentAt: sentAt,
    nextSequence: Math.min(message.sequence + 1, 4), nextDueAt: ["PAUSED", "STOPPED", "CLOSED"].includes(campaign.status) ? null : nextDueAt, revisitAt,
    reason: ["PAUSED", "STOPPED", "CLOSED"].includes(campaign.status) ? campaign.reason : null,
  } });
  await tx.moverProspect.update({ where: { id: message.prospectId }, data: { nextFollowUpAt: ["PAUSED", "STOPPED", "CLOSED"].includes(campaign.status) ? null : nextDueAt } });
  if (message.followUpToId) await tx.recruitmentTask.updateMany({ where: { dedupeKey: `follow-up:${message.followUpToId}`, completedAt: null }, data: { completedAt: sentAt } });
  const config = await settings(tx);
  if (nextDueAt && config.autoTasks && !["PAUSED", "STOPPED", "CLOSED"].includes(campaign.status)) {
    const prospect = await tx.moverProspect.findUniqueOrThrow({ where: { id: message.prospectId }, select: { companyName: true, assignedAdminId: true } });
    await tx.recruitmentTask.upsert({ where: { dedupeKey: `follow-up:${message.id}` },
      create: { dedupeKey: `follow-up:${message.id}`, kind: "MOVER_OUTREACH", prospectId: message.prospectId, assignedAdminId: prospect.assignedAdminId, quoteRequestId: message.quoteRequestId, title: `Follow up with ${prospect.companyName}`, description: "The approved campaign schedules this follow-up. Replies, registration, opt-outs, pauses and inbox sync health are rechecked before sending.", dueAt: nextDueAt }, update: {} });
  }
  if (message.sequence === 4) await tx.recruitmentTask.updateMany({ where: { dedupeKey: `outreach-revisit:${campaign.id}` }, data: { completedAt: sentAt } });
}

export async function stopOutreachAfterRegistration(tx: Tx, email: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(724619833)::text`;
  const campaigns = await tx.outreachCampaign.findMany({ where: { prospect: { email }, status: { in: openCampaignStatuses } }, select: { prospectId: true } });
  for (const campaign of campaigns) {
    await cancelFollowUps(tx, campaign.prospectId);
    await tx.moverProspect.update({ where: { id: campaign.prospectId }, data: { status: "REGISTRATION_STARTED", nextFollowUpAt: null, version: { increment: 1 } } });
    await activity(tx, campaign.prospectId, null, "outreach_stopped_registration");
  }
}

export function explicitReplyOptOut(text: string) {
  const current = text.split(/\n(?:On .+wrote:|From:|_{5,}|-{2,}\s*Original Message)/i)[0].split("\n").filter(line => !/^\s*>/.test(line)).join("\n");
  return /^\s*(?:please\s+)?unsubscribe[.!\s]*$/im.test(current) || /\b(?:unsubscribe\s+(?:me|us)|remove\s+(?:me|us|our company)\s+from\s+(?:your|the)\s+(?:list|mailing list)|do not\s+(?:email|contact)\s+(?:me|us)|stop\s+(?:emailing|contacting)\s+(?:me|us)|no\s+(?:more|further)\s+(?:emails|contact)\s+please)\b/i.test(current);
}

export async function recordOutreachReply(tx: Tx, prospectId: string, receivedAt: Date, conversationId?: string, optOut = false) {
  const prospect = await tx.moverProspect.findUnique({ where: { id: prospectId } });
  if (!prospect) return;
  if (optOut && prospect.email) {
    const { suppressContact } = await import("@/lib/recruitment");
    await suppressContact(tx, prospect.email, "Explicit no-contact request in an onboarding reply", "partner-inbox");
  }
  await tx.moverProspect.update({ where: { id: prospectId }, data: {
    respondedAt: prospect.respondedAt || receivedAt, nextFollowUpAt: null,
    ...(optOut ? { status: "DO_NOT_CONTACT" } : ["NOT_CONTACTED", "CONTACTED"].includes(prospect.status) ? { status: "FOLLOW_UP_REQUIRED" } : {}), version: { increment: 1 },
  } });
  await cancelFollowUps(tx, prospectId);
  await tx.recruitmentTask.upsert({ where: { dedupeKey: `outreach-reply:${prospectId}` },
    create: { dedupeKey: `outreach-reply:${prospectId}`, prospectId, conversationId, kind: "REPLY_REVIEW", title: `Review response from ${prospect.companyName}`, assignedAdminId: prospect.assignedAdminId, priority: "HIGH", dueAt: receivedAt },
    update: { completedAt: null, cancelledAt: null, dueAt: receivedAt },
  });
  await activity(tx, prospectId, null, "response_received", { conversationId: conversationId || null });
}

export async function manageCampaign(tx: Tx, actor: RecruitmentActor, raw: unknown) {
  const input = z.object({ campaignId: z.string(), operation: z.enum(["pause", "resume", "cancel", "dismiss", "postpone", "reengage"]), updatedAt: z.string().datetime(), postponeUntil: z.string().datetime().optional() }).parse(raw);
  const campaign = await tx.outreachCampaign.findUniqueOrThrow({ where: { id: input.campaignId } });
  const prospect = await ownedProspect(tx, actor, campaign.prospectId);
  if (campaign.updatedAt.toISOString() !== input.updatedAt) fail("The campaign changed. Reload before continuing.", 409);
  if (input.operation === "reengage") return prepareCampaignStep(tx, actor, campaign.id, 4);
  if (["resume", "postpone"].includes(input.operation)) await eligibleProspect(tx, prospect);
  if (input.operation === "resume" && campaign.status !== "PAUSED") fail("Only an eligible, paused sequence can resume.");
  if (input.operation === "resume" && campaign.reason?.startsWith("Delivery") && (actor.role !== "OWNER" || await tx.outreachMessage.count({ where: { campaignId: campaign.id, status: { in: ["SENDING", "NEEDS_REVIEW"] } } }))) fail("Delivery uncertainty requires a confirmed provider outcome and owner review before resuming.");
  if (input.operation === "pause" && !["DRAFT", "ACTIVE", "REVIEW_DUE"].includes(campaign.status)) fail("This sequence cannot be paused.");
  if (["dismiss", "postpone"].includes(input.operation) && campaign.status !== "REVIEW_DUE") fail("The three-month review is not due.");
  let revisitAt = campaign.revisitAt;
  if (input.operation === "postpone") {
    revisitAt = input.postponeUntil ? new Date(input.postponeUntil) : addAucklandCalendar(new Date(), { days: 14 });
    if (revisitAt <= new Date()) fail("Choose a future review date.");
  }
  const status = input.operation === "pause" ? "PAUSED" : input.operation === "resume" ? (campaign.initialSentAt ? (campaign.nextSequence === 4 && campaign.revisitAt! <= new Date() ? "REVIEW_DUE" : "ACTIVE") : "DRAFT") : input.operation === "postpone" ? "ACTIVE" : "CLOSED";
  await tx.outreachCampaign.update({ where: { id: campaign.id }, data: { status, revisitAt, reason: input.operation === "pause" ? "Manually paused by an administrator." : null, ...(["cancel", "dismiss"].includes(input.operation) ? { nextDueAt: null } : {}) } });
  if (["cancel", "dismiss"].includes(input.operation)) await tx.outreachMessage.updateMany({ where: { campaignId: campaign.id, status: { in: ["DRAFT", "RETRY"] } }, data: { status: "CANCELLED" } });
  if (["cancel", "dismiss", "postpone"].includes(input.operation)) await tx.recruitmentTask.updateMany({ where: { dedupeKey: `outreach-revisit:${campaign.id}` }, data: input.operation === "postpone" ? { dueAt: revisitAt!, completedAt: null, cancelledAt: null } : { completedAt: new Date() } });
  if (["pause", "cancel", "dismiss"].includes(input.operation)) await tx.recruitmentTask.updateMany({ where: { prospectId: prospect.id, kind: "MOVER_OUTREACH", completedAt: null, cancelledAt: null }, data: { cancelledAt: new Date() } });
  if (input.operation === "resume" && campaign.nextDueAt) await tx.recruitmentTask.updateMany({ where: { prospectId: prospect.id, kind: "MOVER_OUTREACH", completedAt: null }, data: { cancelledAt: null, dueAt: campaign.nextDueAt } });
  await tx.moverProspect.update({ where: { id: prospect.id }, data: { nextFollowUpAt: status === "ACTIVE" ? campaign.nextDueAt : null, version: { increment: 1 } } });
  await activity(tx, prospect.id, actor.id, `outreach_${input.operation}`, { campaignId: campaign.id });
  return { ok: true };
}

export function classifyOutreachFailure(error: unknown) {
  const value = error as { responseCode?: number; code?: string; command?: string };
  if (value.responseCode && value.responseCode >= 500 && value.responseCode < 600) return "PERMANENT";
  if (value.responseCode && value.responseCode >= 400 && value.responseCode < 500) return "RETRYABLE";
  if (["ECONNREFUSED", "EDNS", "ENOTFOUND"].includes(value.code || "") || (value.command === "CONN" && value.code === "ETIMEDOUT")) return "RETRYABLE";
  return "UNCERTAIN";
}

export async function processMoverOutreachCampaigns(limit = 10, synchroniseInbox?: () => Promise<unknown>) {
  // Inbound import is performed by the existing mailbox worker. Never infer
  // silence or send automatic messages while its health is unknown.
  const config = await settings();
  // The review milestone is independent of sending configuration and is always
  // calculated from Day 0, even if a later follow-up was delayed or not sent.
  const dueReviews = await prisma.outreachCampaign.findMany({ where: { status: "ACTIVE", revisitAt: { lte: new Date() } }, take: 25 });
  for (const review of dueReviews) await locked(async tx => {
    const current = await tx.outreachCampaign.findUniqueOrThrow({ where: { id: review.id }, include: { prospect: true } });
    if (current.status !== "ACTIVE" || !current.revisitAt || current.revisitAt > new Date()) return;
    try { await eligibleProspect(tx, current.prospect); }
    catch {
      await cancelFollowUps(tx, current.prospectId);
      return;
    }
    await tx.outreachCampaign.update({ where: { id: current.id }, data: { status: "REVIEW_DUE", nextSequence: 4, nextDueAt: null } });
    await tx.outreachMessage.updateMany({ where: { campaignId: current.id, sequence: { lt: 4 }, status: { in: ["DRAFT", "RETRY"] } }, data: { status: "CANCELLED" } });
    await tx.moverProspect.update({ where: { id: current.prospectId }, data: { nextFollowUpAt: null } });
    await tx.recruitmentTask.updateMany({ where: { prospectId: current.prospectId, kind: "MOVER_OUTREACH", completedAt: null, cancelledAt: null }, data: { cancelledAt: new Date() } });
    await tx.recruitmentTask.upsert({ where: { dedupeKey: `outreach-revisit:${current.id}` },
      create: { dedupeKey: `outreach-revisit:${current.id}`, prospectId: current.prospectId, assignedAdminId: current.prospect.assignedAdminId, title: `Three-month outreach review: ${current.prospect.companyName}`, kind: "REVISIT_DUE", dueAt: current.revisitAt }, update: {} });
  });
  if (!config.automaticFollowUpsEnabled) return { sent: 0, blocked: "Automatic follow-ups are disabled in Email templates & settings." };
  const { bridgeRecruitmentMessages } = await import("@/lib/partner-inbox-outgoing");
  const { syncPartnerInbox } = await import("@/lib/partner-inbox-sync");
  await bridgeRecruitmentMessages();
  await (synchroniseInbox ? synchroniseInbox() : syncPartnerInbox(true));
  const mailbox = await prisma.partnerMailbox.findUnique({ where: { id: "support" } });
  const blocked = mailboxAutomationBlock(mailbox);
  if (blocked) return { sent: 0, blocked };
  const now = new Date();
  const campaigns = await prisma.outreachCampaign.findMany({ where: { status: "ACTIVE", OR: [{ nextDueAt: { lte: now } }, { revisitAt: { lte: now } }] }, orderBy: { updatedAt: "asc" }, take: Math.min(limit, 25) });
  let sent = 0;
  for (const candidate of campaigns) {
    try {
      const prepared = await locked(async tx => {
        const campaign = await tx.outreachCampaign.findUniqueOrThrow({ where: { id: candidate.id }, include: { prospect: { include: { assignedAdmin: true } } } });
        if (campaign.status !== "ACTIVE") return null;
        const user = campaign.prospect.assignedAdmin;
        const { isAdminUser } = await import("@/lib/admin-auth");
        const owner = isAdminUser({ ...user });
        const actor: RecruitmentActor = { id: user.id, role: owner ? "OWNER" : "RECRUITMENT_ADMIN", canSend: owner || user.canSendRecruitment, canViewLeads: owner || user.canViewRecruitmentLeads };
        await checkActor(tx, actor);
        await eligibleProspect(tx, campaign.prospect);
        if (campaign.nextSequence === 4 && campaign.revisitAt && campaign.revisitAt <= now) {
          await tx.outreachCampaign.update({ where: { id: campaign.id }, data: { status: "REVIEW_DUE", nextDueAt: null } });
          await tx.recruitmentTask.upsert({ where: { dedupeKey: `outreach-revisit:${campaign.id}` },
            create: { dedupeKey: `outreach-revisit:${campaign.id}`, prospectId: campaign.prospectId, assignedAdminId: user.id, title: `Three-month outreach review: ${campaign.prospect.companyName}`, kind: "REVISIT_DUE", dueAt: campaign.revisitAt }, update: {} });
          return null;
        }
        if (!campaign.nextDueAt || campaign.nextDueAt > now || campaign.nextSequence > 3) return null;
        const message = await prepareCampaignStep(tx, actor, campaign.id, campaign.nextSequence);
        if (!["DRAFT", "RETRY"].includes(message.status) || (message.retryAt && message.retryAt > now)) return null;
        return { actor, message };
      });
      if (!prepared) continue;
      // The send service repeats live eligibility and mailbox checks under the
      // same shared lock used by reply imports, opt-outs and registration.
      const { approveAndSend } = await import("@/lib/recruitment-outreach");
      const result = await approveAndSend(prepared.actor, { id: prepared.message.id, updatedAt: prepared.message.updatedAt.toISOString(), confirmed: true }, true);
      if (result.ok) sent++;
    } catch (error) {
      // Permission/configuration failures remain visible and retry only after
      // their external condition changes; they never advance the sequence.
      const { RecruitmentError } = await import("@/lib/recruitment");
      if (error instanceof RecruitmentError && error.status === 409) continue;
      await prisma.outreachCampaign.updateMany({ where: { id: candidate.id, status: "ACTIVE" }, data: { reason: error instanceof RecruitmentError ? error.message.slice(0, 300) : "A system check failed. Outreach is waiting for administrator review." } });
    }
  }
  return { sent, checked: campaigns.length };
}

export async function moverOutreachHealth() {
  const config = await settings();
  const mailbox = await prisma.partnerMailbox.findUnique({ where: { id: "support" } });
  return { enabled: config.automaticFollowUpsEnabled, blocked: mailboxAutomationBlock(mailbox), templates: moverTemplateKeys.map(key => ({ key, version: MOVER_TEMPLATE_VERSION, ...moverEmailTemplates[key] })) };
}
