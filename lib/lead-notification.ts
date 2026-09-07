export const MOVER_NEW_LEAD_DEDUPE_PREFIX = "mover-new-lead:";
export const MOVER_LEAD_EXPIRY_WARNING_DEDUPE_PREFIX = "mover-lead-expiry-warning:";

export function getMoverNewLeadDedupeKey(leadId: string) {
  return `${MOVER_NEW_LEAD_DEDUPE_PREFIX}${leadId}`;
}

export function getMoverLeadExpiryWarningDedupeKey(leadId: string) {
  return `${MOVER_LEAD_EXPIRY_WARNING_DEDUPE_PREFIX}${leadId}`;
}
