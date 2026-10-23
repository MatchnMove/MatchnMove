import { createHash, randomBytes } from "crypto";

export type RecruitmentActor = {
  id: string;
  role: "OWNER" | "RECRUITMENT_ADMIN";
  canSend: boolean;
  canViewLeads: boolean;
};
export const statuses = [
  "NOT_CONTACTED",
  "CONTACTED",
  "FOLLOW_UP_REQUIRED",
  "INTERESTED",
  "REGISTRATION_STARTED",
  "REGISTERED",
  "ACTIVE_MOVER",
  "NOT_INTERESTED",
  "DO_NOT_CONTACT",
] as const;
export const manualStatuses = [
  "NOT_CONTACTED",
  "CONTACTED",
  "FOLLOW_UP_REQUIRED",
  "INTERESTED",
  "NOT_INTERESTED",
  "DO_NOT_CONTACT",
] as const;
export const stoppedStatuses = [
  "REGISTERED",
  "ACTIVE_MOVER",
  "NOT_INTERESTED",
  "DO_NOT_CONTACT",
];
export const consentBases = [
  "UNKNOWN",
  "EXPRESS",
  "INFERRED",
  "DEEMED_REVIEWED",
] as const;
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
export function normalizeCompany(name: string) {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function secureToken() {
  return randomBytes(32).toString("base64url");
}
export function scopeProspects(actor: RecruitmentActor) {
  return actor.role === "OWNER" ? {} : { assignedAdminId: actor.id };
}
export function mayAccessProspect(
  actor: RecruitmentActor,
  prospect: { assignedAdminId: string },
) {
  return actor.role === "OWNER" || actor.id === prospect.assignedAdminId;
}
export function contactBlockReason(
  prospect: {
    status: string;
    consentBasis: string;
    consentEvidence: string | null;
  },
  suppressed: boolean,
) {
  if (suppressed || stoppedStatuses.includes(prospect.status))
    return "This company is suppressed or no longer eligible for recruitment.";
  if (
    !consentBases.includes(
      prospect.consentBasis as (typeof consentBases)[number],
    ) ||
    prospect.consentBasis === "UNKNOWN" ||
    !prospect.consentEvidence?.trim()
  )
    return "Record a reviewed contact permission basis and evidence before sending.";
  return null;
}

// Explicit allowlist: never serialize arbitrary customer text, transcripts or addresses.
export const recruitmentLeadSelect = {
  id: true,
  fromRegion: true,
  toRegion: true,
  moveDate: true,
  dateFlexible: true,
  bedrooms: true,
  fromPropertyType: true,
  createdAt: true,
} as const;
type LeadInput = {
  id: string;
  fromRegion: string;
  toRegion: string;
  moveDate: Date | null;
  dateFlexible: boolean;
  bedrooms: string;
  fromPropertyType: string;
  createdAt: Date;
};
import { NZ_SERVICE_AREAS } from "@/lib/nz-regions";
function approvedRegion(value: string) {
  return (
    NZ_SERVICE_AREAS.find(
      (region) =>
        region.toLowerCase() ===
        value
          .trim()
          .replace(/ region$/i, "")
          .toLowerCase(),
    ) || "Region requires review"
  );
}
export function safeLeadSummary(lead: LeadInput) {
  return {
    id: lead.id,
    origin: approvedRegion(lead.fromRegion),
    destination: approvedRegion(lead.toRegion),
    moveDate: lead.moveDate?.toISOString().slice(0, 10) || "Date not provided",
    dateFlexible: lead.dateFlexible,
    bedrooms: /^(studio|[1-9]|[1-9]\+|[1-9] bedrooms?)$/i.test(lead.bedrooms)
      ? lead.bedrooms
      : "Size requires review",
    property:
      /^(house|apartment|flat|unit|townhouse|office|storage|other)$/i.test(
        lead.fromPropertyType,
      )
        ? lead.fromPropertyType
        : "Property requires review",
    createdAt: lead.createdAt.toISOString(),
  };
}
export type SafeLead = ReturnType<typeof safeLeadSummary>;
export function matchProspect(
  prospect: {
    operatingRegion: string | null;
    serviceAreas: string[];
    serviceTypes: string[];
    longDistance: boolean;
  },
  lead: SafeLead,
) {
  const areas = new Set(
    [...prospect.serviceAreas, prospect.operatingRegion || ""].map((area) =>
      area.toLowerCase(),
    ),
  );
  const reasons: string[] = [];
  let score = 0;
  const originCovered = areas.has(lead.origin.toLowerCase());
  const destinationCovered = areas.has(lead.destination.toLowerCase());
  if (originCovered) {
    score += 40;
    reasons.push(`Services origin: ${lead.origin}`);
  }
  if (destinationCovered) {
    score += 40;
    reasons.push(`Covers destination: ${lead.destination}`);
  }
  if (lead.origin !== lead.destination && prospect.longDistance) {
    score += 15;
    reasons.push("Offers long-distance removals");
  }
  const category =
    lead.property.toLowerCase() === "office"
      ? "OFFICE"
      : lead.property.toLowerCase() === "storage"
        ? "STORAGE"
        : "HOUSEHOLD";
  if (prospect.serviceTypes.includes(category)) {
    score += 5;
    reasons.push(`Offers matching ${category.toLowerCase()} services`);
  }
  const requiresReview =
    !originCovered ||
    !destinationCovered ||
    (lead.origin !== lead.destination && !prospect.longDistance) ||
    !prospect.serviceTypes.includes(category) ||
    (!prospect.serviceAreas.length && !prospect.operatingRegion) ||
    lead.origin.includes("review") ||
    lead.destination.includes("review");
  if (requiresReview) reasons.push("Service coverage requires review");
  return { score, reasons, requiresReview };
}
export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
export const defaultIntroduction =
  "We would like to invite your company to join Match 'n Move, connecting New Zealand customers with moving companies. This moving request may suit your services.";
export function renderRecruitmentEmail(input: {
  companyName: string;
  introduction: string;
  lead: SafeLead;
  registrationUrl: string;
  unsubscribeUrl: string;
  sender: string;
}) {
  const subject = `Join Match 'n Move: ${input.lead.origin} to ${input.lead.destination}`;
  const details = `${input.lead.origin} to ${input.lead.destination}\nMoving date: ${input.lead.moveDate}${input.lead.dateFlexible ? " (flexible)" : ""}\nProperty: ${input.lead.property}; bedrooms: ${input.lead.bedrooms}`;
  const disclaimer =
    "This is an invitation to join Match 'n Move. Availability may change; this request is not reserved or guaranteed. Customer contact details are available only through authorised platform access.";
  const text = [
    `Hi ${input.companyName},`,
    input.introduction,
    details,
    disclaimer,
    `Register: ${input.registrationUrl}`,
    input.sender,
    `Unsubscribe: ${input.unsubscribeUrl}`,
    "You can also reply to request no further recruitment emails.",
  ].join("\n\n");
  const e = escapeHtml;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f1f5f9;font:16px Arial,sans-serif;color:#0f172a"><main style="max-width:600px;margin:24px auto;background:#fff;border-radius:20px;overflow:hidden"><header style="background:#0f172a;padding:28px;color:white;font-size:24px;font-weight:bold">Match 'n Move</header><section style="padding:28px"><h1 style="font-size:24px">An invitation to grow with us</h1><p>Hi ${e(input.companyName)},</p><p style="line-height:1.7">${e(input.introduction).replaceAll("\n", "<br>")}</p><div style="padding:20px;background:#f0fdfa;border-radius:12px;line-height:1.8">${e(details).replaceAll("\n", "<br>")}</div><p style="line-height:1.6">${e(disclaimer)}</p><p style="padding:16px 0"><a href="${e(input.registrationUrl)}" style="background:#0f766e;color:white;padding:16px 24px;border-radius:8px;text-decoration:none;display:inline-block">Join Match 'n Move</a></p><p>${e(input.sender)}</p><hr style="border:0;border-top:1px solid #e2e8f0"><p style="font-size:13px;line-height:1.7"><a href="${e(input.unsubscribeUrl)}">Unsubscribe from recruitment invitations</a><br>You can also reply to request no further recruitment emails.</p></section></main></body></html>`;
  return { subject, text, html };
}
