export const outreachStageNames = ["Invitation", "First follow-up", "Second follow-up", "Final follow-up", "Re-engagement"];
export function outreachStageName(sequence: number) {
  return outreachStageNames[sequence] || `Follow-up ${sequence}`;
}
export type OutreachProgressMessage = { status: string; sequence: number; sentAt: Date | string | null; templateKey?: string | null };
export function companyEmailProgress(messages: OutreachProgressMessage[], nextDueAt?: Date | string | null, campaignStatus?: string | null) {
  const sent = messages.filter(message => message.status === "SENT" && message.sentAt)
    .sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime());
  const last = sent[0];
  const needsReview = messages.some(message => message.status === "NEEDS_REVIEW");
  const sending = messages.some(message => message.status === "SENDING");
  const draft = messages.find(message => message.status === "DRAFT" || message.status === "RETRY");
  return {
    stage: needsReview ? "Delivery needs review" : sending ? "Sending in progress" : last ? `${outreachStageName(last.sequence)} sent` : draft ? "Invitation drafted" : "Not started",
    lastSentAt: last?.sentAt || null,
    next: campaignStatus === "PAUSED" ? "Follow-ups paused" : ["STOPPED", "CLOSED"].includes(campaignStatus || "") ? "Sequence stopped" : campaignStatus === "REVIEW_DUE" ? "Re-engagement review due" : draft ? `${outreachStageName(draft.sequence)} ${draft.status === "RETRY" ? "awaiting retry" : "draft ready"}` : nextDueAt ? "Next follow-up scheduled" : null,
    nextDueAt: campaignStatus === "ACTIVE" ? nextDueAt || null : null,
    needsReview,
  };
}
