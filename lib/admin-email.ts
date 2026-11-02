// Shared by the admin UI and both email transports. Credentials identify the
// account; they must never replace the address shown to recipients.
export const ADMIN_EMAIL_ADDRESS = "contact@matchnmove.co.nz";
export const ADMIN_EMAIL_FROM = `Match 'n Move <${ADMIN_EMAIL_ADDRESS}>`;

export function isAdminEmailKind(kind: string) {
  return ["recruitment_invitation", "admin_team_invitation", "admin_password_reset"].includes(kind);
}

export function adminEmailEnvelope(kind: string, from: string, replyTo?: string | null) {
  return isAdminEmailKind(kind)
    ? { from: ADMIN_EMAIL_FROM, replyTo: ADMIN_EMAIL_ADDRESS }
    : { from, replyTo };
}

// Keep recognising earlier conversations without changing their sent history.
export function isAdminEmailAddress(address: string, accountAddress?: string) {
  return [ADMIN_EMAIL_ADDRESS, "support@matchnmove.co.nz", "recruitment@matchnmove.co.nz", accountAddress?.toLowerCase()]
    .includes(address.trim().toLowerCase());
}

export type GmailSendAs = { sendAsEmail?: string; isPrimary?: boolean; verificationStatus?: string };

export function assertAdminGmailSender(settings: { sendAs?: GmailSendAs[] }) {
  if (!settings.sendAs?.some(sender =>
    sender.sendAsEmail?.trim().toLowerCase() === ADMIN_EMAIL_ADDRESS &&
    (sender.isPrimary === true || sender.verificationStatus === "accepted"))) {
    throw new Error(`The connected Google account must have ${ADMIN_EMAIL_ADDRESS} as its primary address or a verified Send mail as address.`);
  }
}
