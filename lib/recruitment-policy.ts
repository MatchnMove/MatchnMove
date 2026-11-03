import { createHash, randomBytes } from "crypto";
import { outreachEmailLayout } from "@/lib/outreach-email-layout";
import { stoppedStatuses } from "@/lib/recruitment-stages";
import type { PartnerBusinessType } from "@/lib/partner-business";
export { statuses, manualStatuses, stoppedStatuses } from "@/lib/recruitment-stages";

export type RecruitmentActor = {
  id: string;
  role: "OWNER" | "RECRUITMENT_ADMIN";
  canSend: boolean;
  canViewLeads: boolean;
};
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
    removedAt?: Date | string | null;
  },
  suppressed: boolean,
) {
  if (prospect.removedAt) return "This company has been removed from the directory. Outreach is stopped.";
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
export const defaultGeneralIntroduction =
  "We would love to introduce your company to Match 'n Move, a New Zealand platform connecting people planning a move with moving companies. Joining is free: create your company profile, choose the areas you cover and review relevant quote requests as they become available. You choose which leads to open, with the price shown beforehand. If this sounds useful for your business, you can find out more and register below.";
export const defaultCleaningIntroduction =
  "We would love to introduce your company to Match 'n Move, a New Zealand platform connecting people planning a move with cleaning companies for move-out and move-in cleaning. Joining is free: create your company profile, choose the areas you cover and review relevant cleaning enquiries as they become available. You choose which leads to open, with the price shown beforehand. If this sounds useful for your business, you can find out more and register below.";
export function renderRecruitmentEmail(input: {
  companyName: string;
  businessType?: PartnerBusinessType;
  introduction: string;
  lead: SafeLead | null;
  registrationUrl: string;
  unsubscribeUrl: string;
  sender: string;
}) {
  const subject = input.lead
    ? `Join Match 'n Move: ${input.lead.origin} to ${input.lead.destination}`
    : "An invitation to join Match 'n Move";
  const details = input.lead
    ? `${input.lead.origin} to ${input.lead.destination}\nMoving date: ${input.lead.moveDate}${input.lead.dateFlexible ? " (flexible)" : ""}\nProperty: ${input.lead.property}; bedrooms: ${input.lead.bedrooms}`
    : "Free to join\nChoose your service areas\nReview lead pricing before opening customer details";
  const disclaimer = input.lead
    ? "This is an invitation to join Match 'n Move. Availability may change; this request is not reserved or guaranteed. Customer contact details are available only through authorised platform access."
    : `This is a general invitation to join Match 'n Move, not an offer of a specific ${input.businessType === "CLEANING" ? "cleaning" : "moving"} job. Enquiry volumes and bookings are not guaranteed.`;
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
  const html = outreachEmailLayout({ businessType: input.businessType, title: "You're invited to grow with us.", preheader: "Free to join. Relevant enquiries. Your choice of leads.",
    body: `<p style="margin:0 0 20px">Hi ${e(input.companyName)},</p><p style="margin:0 0 20px">${e(input.introduction).replaceAll("\n", "<br>")}</p><div style="padding:20px;background:#f0fdfa;border-radius:8px">${e(details).replaceAll("\n", "<br>")}</div><p style="margin:24px 0"><a href="${e(input.registrationUrl)}" style="display:inline-block;background:#0f766e;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Join Match 'n Move</a></p><p>${e(input.sender)}</p>`,
    footer: `${e(disclaimer)}<br><a href="${e(input.unsubscribeUrl)}" style="color:#475569">Unsubscribe from recruitment invitations</a><br>You can also reply to request no further recruitment emails.`,
  });
  return { subject, text, html };
}
