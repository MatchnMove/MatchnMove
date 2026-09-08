export function getCleanerNewLeadDedupeKey(leadId: string) {
  return `cleaner-new-lead:${leadId}`;
}

export function getCleanerLeadUnlockedDedupeKey(leadId: string) {
  return `cleaner-lead-unlocked:${leadId}`;
}

export function getCleanerInvoiceAvailableDedupeKey(invoiceId: string) {
  return `cleaner-invoice-available:${invoiceId}`;
}
