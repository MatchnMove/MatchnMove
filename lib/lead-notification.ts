export const MOVER_NEW_LEAD_DEDUPE_PREFIX = "mover-new-lead:";

export function getMoverNewLeadDedupeKey(leadId: string) {
  return `${MOVER_NEW_LEAD_DEDUPE_PREFIX}${leadId}`;
}
