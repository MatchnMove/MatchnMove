export const SITE_EMAILS = {
  support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@matchnmove.co.nz",
  info: process.env.NEXT_PUBLIC_INFO_EMAIL ?? "info@matchnmove.co.nz",
  contact: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@matchnmove.co.nz",
  partners: process.env.NEXT_PUBLIC_PARTNERS_EMAIL ?? "partners@matchnmove.co.nz",
  feedback: process.env.NEXT_PUBLIC_FEEDBACK_EMAIL ?? "feedback@matchnmove.co.nz",
  privacy: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@matchnmove.co.nz",
  noReply: process.env.NEXT_PUBLIC_NO_REPLY_EMAIL ?? "no-reply@matchnmove.co.nz",
} as const;

export function toMailto(email: string) {
  return `mailto:${email}`;
}
