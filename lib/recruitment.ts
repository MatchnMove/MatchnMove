import { Prisma, RecruitmentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAnyAdminUser, isAdminUser } from "@/lib/admin-auth";
import {
  RecruitmentActor,
  contactBlockReason,
  consentBases,
  defaultIntroduction,
  defaultGeneralIntroduction,
  manualStatuses,
  normalizeCompany,
  normalizeEmail,
  recruitmentLeadSelect,
  renderRecruitmentEmail,
  safeLeadSummary,
  scopeProspects,
  secureToken,
  stoppedStatuses,
  tokenHash,
} from "@/lib/recruitment-policy";
import { NZ_SERVICE_AREAS } from "@/lib/nz-regions";
import { createHash } from "node:crypto";
import { verifySmtpConnection } from "@/lib/email";

export class RecruitmentError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function fail(message: string, status = 400): never {
  throw new RecruitmentError(message, status);
}
export async function recruitmentActor(): Promise<RecruitmentActor> {
  const session = await auth();
  if (
    !session?.user ||
    !isAnyAdminUser(session.user) ||
    !session.user.mfaVerified
  )
    fail("Sign in and complete admin MFA.", 401);
  const owner = isAdminUser({ ...session.user });
  return {
    id: session.user.id,
    role: owner ? "OWNER" : "RECRUITMENT_ADMIN",
    canSend: owner || session.user.canSendRecruitment,
    canViewLeads: owner || session.user.canViewRecruitmentLeads,
  };
}
export function ownerOnly(actor: RecruitmentActor) {
  if (actor.role !== "OWNER") fail("Owner access required.", 403);
}
export type Tx = Prisma.TransactionClient;
// Every privileged recruitment mutation, registration claim and unsubscribe shares this lock.
export async function locked<T>(fn: (tx: Tx) => Promise<T>) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(724619833)::text`;
      return fn(tx);
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
export async function checkActor(tx: Tx, actor: RecruitmentActor) {
  const user = await tx.user.findUnique({ where: { id: actor.id } });
  if (!user || !isAnyAdminUser(user) || user.adminDisabledAt)
    fail("Account access has changed. Sign in again.", 403);
  const owner = isAdminUser(user);
  if ((actor.role === "OWNER") !== owner)
    fail("Account permissions have changed.", 403);
  return user;
}
export async function ownedProspect(
  tx: Tx,
  actor: RecruitmentActor,
  id: string,
) {
  const prospect = await tx.moverProspect.findFirst({
    where: { id, ...scopeProspects(actor) },
  });
  if (!prospect) fail("Company not found.", 404);
  return prospect;
}
export async function activity(
  tx: Tx,
  prospectId: string,
  actorId: string | null,
  action: string,
  meta?: Prisma.InputJsonValue,
) {
  await tx.recruitmentActivity.create({
    data: { prospectId, actorId, action, meta },
  });
}
export async function audit(
  tx: Tx,
  actorId: string,
  action: string,
  meta: Prisma.InputJsonValue,
) {
  await tx.adminAuditLog.create({ data: { actorId, action, meta } });
}
export const recruitmentSettingsSchema = z.object({
  sendingEnabled: z.boolean().default(false),
  senderIdentity: z.string().trim().max(300).default(""),
  dailyLimit: z.number().int().min(1).max(100).default(20),
  followUpDays: z.number().int().min(1).max(60).default(5),
  autoTasks: z.boolean().default(true),
  introduction: z
    .string()
    .trim()
    .min(20)
    .max(1500)
    .default(defaultIntroduction),
  generalIntroduction: z.string().trim().min(20).max(1500).default(defaultGeneralIntroduction),
});
export async function settings(tx: Pick<Tx, "recruitmentSetting"> = prisma) {
  const row = await tx.recruitmentSetting.findUnique({
    where: { key: "outreach" },
  });
  return recruitmentSettingsSchema.parse(row?.value || {});
}
export function baseUrl() {
  const url =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";
  if (process.env.NODE_ENV === "production" && !url.startsWith("https://"))
    fail("Configure a public HTTPS NEXTAUTH_URL.", 503);
  return url;
}
export function senderAddress() {
  return (
    process.env.RECRUITMENT_FROM_EMAIL?.trim() ||
    process.env.DEFAULT_FROM_EMAIL?.trim() ||
    ""
  );
}
function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      senderAddress(),
  );
}
function senderFingerprint() {
  return createHash("sha256").update(JSON.stringify([
    process.env.SMTP_HOST, process.env.SMTP_PORT, process.env.SMTP_USER, process.env.SMTP_PASS,
    process.env.SMTP_SECURE, process.env.SMTP_REQUIRE_TLS, senderAddress(), process.env.RECRUITMENT_REPLY_TO,
  ])).digest("hex");
}
export async function emailReady(tx: Pick<Tx, "recruitmentSetting"> = prisma) {
  if (!smtpConfigured()) return false;
  if (process.env.RECRUITMENT_EMAIL_VERIFIED === "true") return true;
  const row = await tx.recruitmentSetting.findUnique({ where: { key: "sender-verification" } });
  return Boolean(row && typeof row.value === "object" && !Array.isArray(row.value) && row.value?.fingerprint === senderFingerprint());
}
export async function verifyRecruitmentSender(actor: RecruitmentActor) {
  ownerOnly(actor);
  await locked(tx => checkActor(tx, actor));
  if (!smtpConfigured()) fail("Complete the email server and sender configuration before checking the connection.", 503);
  const fingerprint = senderFingerprint();
  try { await verifySmtpConnection(); }
  catch { fail("The email connection could not be verified. Check the configured email service and try again.", 503); }
  return locked(async tx => {
    await checkActor(tx, actor);
    if (fingerprint !== senderFingerprint()) fail("Email settings changed during verification. Run the check again.", 409);
    await tx.recruitmentSetting.upsert({
      where: { key: "sender-verification" },
      create: { key: "sender-verification", value: { fingerprint, verifiedAt: new Date().toISOString(), verifiedBy: actor.id } },
      update: { value: { fingerprint, verifiedAt: new Date().toISOString(), verifiedBy: actor.id } },
    });
    await audit(tx, actor.id, "recruitment_sender_verified", { sender: senderAddress() });
    return { ok: true, message: "Email connection verified. No message was sent. You can now enable individually approved sending." };
  });
}

const optionalText = z.string().trim().max(1000).nullable().optional();
export const prospectSchema = z.object({
  companyName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(254).transform(normalizeEmail),
  contactName: z.string().trim().max(150).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  website: z
    .union([
      z.literal(""),
      z
        .string()
        .url()
        .max(500)
        .refine((url) => /^https?:\/\//.test(url)),
    ])
    .nullable()
    .optional(),
  operatingRegion: z.enum(NZ_SERVICE_AREAS).nullable().optional(),
  serviceAreas: z.array(z.enum(NZ_SERVICE_AREAS)).max(16).default([]),
  serviceTypes: z
    .array(z.enum(["HOUSEHOLD", "OFFICE", "PACKING", "STORAGE", "SPECIALTY"]))
    .max(5)
    .default([]),
  longDistance: z.boolean().default(false),
  consentBasis: z.enum(consentBases).default("UNKNOWN"),
  consentEvidence: optionalText,
  notes: z.string().trim().max(10000).nullable().optional(),
  duplicateReviewNote: optionalText,
});

export async function prepareDraft(
  tx: Tx,
  actor: RecruitmentActor,
  prospectId: string,
  quoteRequestId: string | null = null,
  followUpToId?: string,
) {
  const prospect = await ownedProspect(tx, actor, prospectId);
  const user = await checkActor(tx, actor);
  if (quoteRequestId && actor.role !== "OWNER" && !user.canViewRecruitmentLeads)
    fail("Lead summary access has not been authorised.", 403);
  const blocked = contactBlockReason(
    prospect,
    Boolean(
      await tx.contactSuppression.findUnique({
        where: { email: prospect.email },
      }),
    ),
  );
  if (blocked) fail(blocked);
  const lead = quoteRequestId ? await tx.quoteRequest.findFirst({
    where: {
      id: quoteRequestId,
      recruitmentSharingAllowed: true,
      sharingConsentAt: { not: null },
    },
    select: recruitmentLeadSelect,
  }) : null;
  if (quoteRequestId && !lead) fail("An authorised lead summary was not found.", 404);
  const parent = followUpToId
    ? await tx.outreachMessage.findFirst({
        where: { id: followUpToId, prospectId, quoteRequestId, status: "SENT" },
      })
    : null;
  if (followUpToId && !parent)
    fail("Choose a successfully sent invitation for follow-up.");
  if (parent && prospect.respondedAt)
    fail(
      "This company has responded. Record and manage its next step directly.",
    );
  const existing = await tx.outreachMessage.findFirst({
    where: followUpToId
      ? { followUpToId }
      : { prospectId, quoteRequestId, sequence: 0 },
  });
  if (
    existing &&
    (existing.status !== "DRAFT" || existing.attributionExpiresAt > new Date())
  )
    return existing;
  const config = await settings(tx);
  const registrationToken = secureToken();
  const unsubscribeToken = secureToken();
  const introduction =
    existing?.introduction ||
    (parent
      ? `We are following up on our invitation to join Match 'n Move. If this is relevant to your business, you can review the platform and register below.${lead ? " Availability of the original moving request may have changed." : ""}`
      : lead ? config.introduction : config.generalIntroduction);
  const rendered = renderRecruitmentEmail({
    companyName: prospect.companyName,
    introduction,
    lead: lead ? safeLeadSummary(lead) : null,
    registrationUrl: `${baseUrl()}/api/recruitment/attribution?token=${registrationToken}`,
    unsubscribeUrl: `${baseUrl()}/recruitment/unsubscribe?token=${unsubscribeToken}`,
    sender: config.senderIdentity || "Match 'n Move",
  });
  const data = {
    prospectId,
    quoteRequestId,
    adminId: actor.id,
    ...rendered,
    introduction,
    sequence: parent ? parent.sequence + 1 : 0,
    followUpToId,
    attributionHash: tokenHash(registrationToken),
    attributionExpiresAt: new Date(Date.now() + 30 * 86400000),
    unsubscribeHash: tokenHash(unsubscribeToken),
  };
  const message = existing
    ? await tx.outreachMessage.update({ where: { id: existing.id }, data })
    : await tx.outreachMessage.create({ data });
  await activity(
    tx,
    prospectId,
    actor.id,
    existing ? "draft_links_refreshed" : "draft_created",
    {
      messageId: message.id,
    },
  );
  return message;
}

export async function cancelFollowUps(tx: Tx, prospectId: string) {
  await tx.outreachMessage.updateMany({
    where: { prospectId, status: "DRAFT", followUpToId: { not: null } },
    data: { status: "CANCELLED" },
  });
  await tx.recruitmentTask.updateMany({
    where: { prospectId, completedAt: null, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });
}
export async function suppressContact(
  tx: Tx,
  email: string,
  reason: string,
  source: string,
  actorId: string | null = null,
) {
  await tx.contactSuppression.upsert({
    where: { email },
    update: { reason, source },
    create: { email, reason, source },
  });
  const prospect = await tx.moverProspect.findUnique({ where: { email } });
  if (prospect) {
    await tx.moverProspect.update({
      where: { id: prospect.id },
      data: {
        status: "DO_NOT_CONTACT",
        nextFollowUpAt: null,
        version: { increment: 1 },
      },
    });
    await cancelFollowUps(tx, prospect.id);
    await tx.outreachMessage.updateMany({
      where: { prospectId: prospect.id, status: { in: ["DRAFT", "QUEUED"] } },
      data: { status: "CANCELLED" },
    });
    await activity(tx, prospect.id, actorId, "contact_suppressed", {
      reason,
      source,
    });
  }
}

export async function saveProspect(
  tx: Tx,
  actor: RecruitmentActor,
  raw: unknown,
  id?: string,
  version?: number,
) {
  const data = prospectSchema.parse(raw);
  const normalizedName = normalizeCompany(data.companyName);
  const prior = id ? await ownedProspect(tx, actor, id) : null;
  if (prior && prior.version !== version)
    fail("This company changed. Reload before saving.", 409);
  if (prior && data.email !== prior.email && prior.status !== "NOT_CONTACTED")
    fail(
      "After contact, record an email correction through an owner-reviewed new prospect.",
    );
  if (
    prior &&
    data.email !== prior.email &&
    data.consentBasis !== "UNKNOWN" &&
    data.consentEvidence === prior.consentEvidence
  )
    fail(
      "Record fresh contact permission evidence for the new email, or reset its permission basis to Unknown.",
    );
  const duplicate = await tx.moverProspect.findFirst({
    where: {
      id: { not: id || "" },
      OR: [
        { email: data.email },
        { normalizedName },
        ...(data.website ? [{ website: data.website }] : []),
        ...(data.phone ? [{ phone: data.phone }] : []),
      ],
    },
  });
  if (duplicate?.email === data.email)
    fail(
      "This email already belongs to a prospect. Ask the owner to review its assignment.",
      409,
    );
  if (
    duplicate &&
    (actor.role !== "OWNER" || !data.duplicateReviewNote?.trim())
  )
    fail(
      "A matching company, website or phone exists. Owner review and a duplicate-review explanation are required.",
      409,
    );
  const permissionChanged =
    !prior ||
    prior.email !== data.email ||
    prior.consentBasis !== data.consentBasis ||
    prior.consentEvidence !== data.consentEvidence;
  if (data.consentBasis !== "UNKNOWN" && !data.consentEvidence?.trim())
    fail("Provide evidence for this contact permission basis.");
  const common = {
    ...data,
    normalizedName,
    ...(duplicate ? { duplicateOfId: duplicate.id } : {}),
    ...(permissionChanged
      ? { consentRecordedAt: new Date(), consentRecordedBy: actor.id }
      : {}),
  };
  const prospect = prior
    ? await tx.moverProspect.update({
        where: { id: prior.id },
        data: { ...common, version: { increment: 1 } },
      })
    : await tx.moverProspect.create({
        data: { ...common, assignedAdminId: actor.id },
      });
  await activity(
    tx,
    prospect.id,
    actor.id,
    prior ? "prospect_updated" : "prospect_created",
  );
  if (permissionChanged)
    await audit(tx, actor.id, "recruitment_contact_permission", {
      prospectId: prospect.id,
      basis: data.consentBasis,
    });
  return prospect;
}

export async function setProspectStatus(
  tx: Tx,
  actor: RecruitmentActor,
  id: string,
  status: (typeof manualStatuses)[number],
  version: number,
) {
  const prospect = await ownedProspect(tx, actor, id);
  if (prospect.version !== version)
    fail("This record changed. Reload before updating.", 409);
  if (status === "DO_NOT_CONTACT") {
    await suppressContact(
      tx,
      prospect.email,
      "Admin recorded do not contact",
      "admin",
      actor.id,
    );
    return;
  }
  if (stoppedStatuses.includes(prospect.status))
    fail(
      "A terminal recruitment status cannot be manually reopened. Suppressions remain in force.",
    );
  await tx.moverProspect.update({
    where: { id },
    data: {
      status: status as RecruitmentStatus,
      version: { increment: 1 },
      ...(status === "INTERESTED"
        ? {
            respondedAt: prospect.respondedAt || new Date(),
            interestedAt: prospect.interestedAt || new Date(),
          }
        : {}),
      ...(status === "NOT_INTERESTED"
        ? {
            respondedAt: prospect.respondedAt || new Date(),
            nextFollowUpAt: null,
          }
        : {}),
    },
  });
  if (status === "NOT_INTERESTED") await cancelFollowUps(tx, id);
  if (status === "INTERESTED") {
    await cancelFollowUps(tx, id);
    const config = await settings(tx);
    if (config.autoTasks)
      await tx.recruitmentTask.upsert({
        where: { dedupeKey: `response:${id}` },
        update: {},
        create: {
          dedupeKey: `response:${id}`,
          title: `Respond to ${prospect.companyName}`,
          description:
            "Review the company's response and help with registration.",
          assignedAdminId: prospect.assignedAdminId,
          prospectId: id,
          priority: "HIGH",
          dueAt: new Date(),
        },
      });
  }
  await activity(
    tx,
    id,
    actor.id,
    status === "INTERESTED" || status === "NOT_INTERESTED"
      ? "prospect_replied"
      : "status_changed",
    { from: prospect.status, to: status },
  );
}
