import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fail, settings } from "@/lib/recruitment";
import { mailboxAutomationBlock } from "@/lib/mover-outreach-campaigns";
import { scopeProspects, type RecruitmentActor } from "@/lib/recruitment-policy";
import { emailStationStatuses, type EmailStationStatus } from "@/lib/email-station-policy";
import { outreachEmailTemplates, templateKeysForBusiness } from "@/lib/mover-outreach-templates";
import { z } from "zod";

export const emailStationQuery = z.object({
  q: z.string().trim().max(100).default(""), status: z.enum(emailStationStatuses).optional(),
  businessType: z.enum(["MOVING", "CLEANING"]).optional(), page: z.coerce.number().int().min(1).max(10000).default(1),
});

type StationRow = {
  id: string; companyName: string; contactName: string | null; email: string | null; businessType: "MOVING" | "CLEANING";
  companyStatus: string; respondedAt: Date | null; registeredAt: Date | null;
  campaignId: string | null; campaignStatus: string | null; nextSequence: number | null;
  initialSentAt: Date | null; lastSentAt: Date | null; nextDueAt: Date | null; revisitAt: Date | null;
  hasLegacy: boolean; hasDraft: boolean; needsReview: boolean; sentCount: number; status: EmailStationStatus;
};

// Classify the latest sequence for each scoped company in the database, before
// counting or paginating. Past campaigns cannot override a current sequence.
function stationRecords(actor: RecruitmentActor, businessType?: "MOVING" | "CLEANING") {
  return Prisma.sql`WITH records AS (
    SELECT p.id, p."companyName", p."contactName", p.email, p."businessType", p.status::text AS "companyStatus", p."respondedAt", p."registeredAt", p."moverCompanyId", p."cleanerCompanyId",
      c.id AS "campaignId", c.status AS "campaignStatus", c."nextSequence", c."initialSentAt", c."nextDueAt", c."revisitAt",
      m."lastSentAt", m."hasLegacy", m."hasDraft", m."needsReview", m.sending, m."sentCount"
    FROM "MoverProspect" p
    LEFT JOIN LATERAL (SELECT * FROM "OutreachCampaign" WHERE "prospectId" = p.id ORDER BY "createdAt" DESC, id DESC LIMIT 1) c ON true
    LEFT JOIN LATERAL (
      SELECT max("sentAt") FILTER (WHERE status = 'SENT') AS "lastSentAt",
        coalesce(bool_or("campaignId" IS NULL), false) AS "hasLegacy",
        coalesce(bool_or(status IN ('DRAFT', 'RETRY')), false) AS "hasDraft",
        coalesce(bool_or(status = 'NEEDS_REVIEW'), false) AS "needsReview",
        coalesce(bool_or(status = 'SENDING'), false) AS sending,
        (count(*) FILTER (WHERE status = 'SENT' AND "sentAt" IS NOT NULL))::int AS "sentCount"
      FROM "OutreachMessage" WHERE "prospectId" = p.id
    ) m ON true
    WHERE p."removedAt" IS NULL
      ${actor.role === "OWNER" ? Prisma.empty : Prisma.sql`AND p."assignedAdminId" = ${actor.id}`}
      ${businessType ? Prisma.sql`AND p."businessType" = ${businessType}::"PartnerBusinessType"` : Prisma.empty}
  ), classified AS (
    SELECT *, CASE
      WHEN "companyStatus" = 'REGISTRATION_STARTED' THEN 'REGISTERING'
      WHEN "registeredAt" IS NOT NULL OR "moverCompanyId" IS NOT NULL OR "cleanerCompanyId" IS NOT NULL OR "companyStatus" IN ('REGISTERED', 'ACTIVE_MOVER') THEN 'REGISTERED'
      WHEN "companyStatus" IN ('DO_NOT_CONTACT', 'NOT_INTERESTED') THEN 'STOPPED'
      WHEN "respondedAt" IS NOT NULL THEN 'RESPONSE_RECEIVED'
      WHEN "needsReview" THEN 'NEEDS_REVIEW'
      WHEN sending THEN 'SENDING'
      WHEN "campaignStatus" = 'REVIEW_DUE' OR ("campaignStatus" = 'ACTIVE' AND "revisitAt" <= CURRENT_TIMESTAMP) THEN 'REVISIT_DUE'
      WHEN "campaignStatus" = 'PAUSED' THEN 'PAUSED'
      WHEN "campaignStatus" IN ('STOPPED', 'CLOSED') THEN 'STOPPED'
      WHEN "campaignStatus" = 'ACTIVE' THEN 'IN_PROGRESS'
      WHEN "campaignStatus" = 'DRAFT' OR "hasDraft" THEN 'DRAFT'
      WHEN "hasLegacy" THEN 'LEGACY'
      ELSE 'NOT_STARTED' END AS status FROM records
  )`;
}

export async function emailStationCompanies(actor: RecruitmentActor, raw: unknown) {
  const input = emailStationQuery.parse(raw);
  const records = stationRecords(actor, input.businessType);
  const pattern = `%${input.q.replace(/[\\%_]/g, "\\$&")}%`;
  const filter = Prisma.sql`WHERE true ${input.q ? Prisma.sql`AND ("companyName" ILIKE ${pattern} OR "contactName" ILIKE ${pattern} OR email ILIKE ${pattern})` : Prisma.empty} ${input.status === "IN_PROGRESS" ? Prisma.sql`AND status IN ('IN_PROGRESS', 'SENDING')` : input.status ? Prisma.sql`AND status = ${input.status}` : Prisma.empty}`;
  const [items, count, metrics] = await Promise.all([
    prisma.$queryRaw<StationRow[]>(Prisma.sql`${records} SELECT * FROM classified ${filter}
      ORDER BY CASE status WHEN 'NEEDS_REVIEW' THEN 0 WHEN 'REVISIT_DUE' THEN 1 WHEN 'SENDING' THEN 2 ELSE 3 END,
        CASE WHEN status = 'IN_PROGRESS' THEN coalesce("nextDueAt", "revisitAt") END ASC NULLS LAST, "companyName" ASC, id ASC LIMIT 25 OFFSET ${(input.page - 1) * 25}`),
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`${records} SELECT count(*)::int AS count FROM classified ${filter}`),
    prisma.$queryRaw<Array<{ companies: number; inProgress: number; responses: number; revisitDue: number }>>(Prisma.sql`${records} SELECT count(*)::int AS companies, (count(*) FILTER (WHERE status IN ('IN_PROGRESS', 'SENDING')))::int AS "inProgress", (count(*) FILTER (WHERE status = 'RESPONSE_RECEIVED'))::int AS responses, (count(*) FILTER (WHERE status = 'REVISIT_DUE'))::int AS "revisitDue" FROM classified`),
  ]);
  return { items: items.map(publicRecord), count: count[0].count, page: input.page, pageSize: 25, metrics: metrics[0] };
}

function publicRecord(row: StationRow) {
  return { id: row.id, companyName: row.companyName, contactName: row.contactName, email: row.email, businessType: row.businessType,
    companyStatus: row.companyStatus, respondedAt: row.respondedAt, registeredAt: row.registeredAt,
    campaignId: row.campaignId, campaignStatus: row.campaignStatus, nextSequence: row.nextSequence,
    initialSentAt: row.initialSentAt, lastSentAt: row.lastSentAt, nextDueAt: row.nextDueAt, revisitAt: row.revisitAt,
    hasLegacy: row.hasLegacy, hasDraft: row.hasDraft, needsReview: row.needsReview, sentCount: row.sentCount, status: row.status };
}

export async function emailStationCompany(actor: RecruitmentActor, id: string) {
  const records = stationRecords(actor);
  const [row] = await prisma.$queryRaw<StationRow[]>(Prisma.sql`${records} SELECT * FROM classified WHERE id = ${id}`);
  if (!row) fail("Company not found.", 404);
  const company = await prisma.moverProspect.findFirst({
    where: { id, removedAt: null, ...scopeProspects(actor) },
    select: { id: true, consentBasis: true, consentEvidence: true, nextFollowUpAt: true,
      outreachCampaigns: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10, select: { id: true, status: true, updatedAt: true, reason: true, initialSentAt: true, lastSentAt: true, nextSequence: true, nextDueAt: true, revisitAt: true, createdAt: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, campaignId: true, subject: true, sequence: true, status: true, templateKey: true, templateVersion: true, sentAt: true, scheduledAt: true, retryAt: true, createdAt: true, updatedAt: true, lastError: true, quoteRequestId: true } },
      _count: { select: { messages: true } },
    },
  });
  if (!company) fail("Company not found.", 404);
  const [config, mailbox] = await Promise.all([settings(), prisma.partnerMailbox.findUnique({ where: { id: "support" } })]);
  return { company: publicRecord(row), campaign: company.outreachCampaigns[0] || null, campaigns: company.outreachCampaigns,
    messages: company.messages.map(({ quoteRequestId, ...message }) => ({ ...message, subject: quoteRequestId && !actor.canViewLeads ? "Moving opportunity invitation" : message.subject, canPreview: !quoteRequestId || actor.canViewLeads, hasLead: Boolean(quoteRequestId) })),
    messageCount: company._count.messages,
    permissionRecorded: company.consentBasis !== "UNKNOWN" && Boolean(company.consentEvidence?.trim()),
    manualFollowUpAt: company.nextFollowUpAt,
    automation: { enabled: config.automaticFollowUpsEnabled, blocked: mailboxAutomationBlock(mailbox) },
    templates: templateKeysForBusiness(row.businessType).map((key, index) => ({ key, name: outreachEmailTemplates[key].name, subject: outreachEmailTemplates[key].subject.replaceAll("[Company Name]", row.companyName), sequence: index < 2 ? 0 : index - 1 })),
  };
}

type JsonDates<T> = T extends Date ? string : T extends Array<infer U> ? JsonDates<U>[] : T extends object ? { [K in keyof T]: JsonDates<T[K]> } : T;
export type EmailStationList = JsonDates<Awaited<ReturnType<typeof emailStationCompanies>>>;
export type EmailStationDetail = JsonDates<Awaited<ReturnType<typeof emailStationCompany>>>;
