import { z } from "zod";

export const contactAvailability = ["PUBLIC", "NOT_PUBLIC"] as const;
export function validBusinessEmail(value: string | null | undefined): value is string {
  return Boolean(value && z.string().email().max(254).safeParse(value).success);
}
export function validBusinessPhone(value: string | null | undefined): value is string {
  if (!value || !/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
type Contacts = {
  email?: string | null;
  phone?: string | null;
  emailAvailability?: string | null;
  phoneAvailability?: string | null;
};
export function contactFollowUp(contact: Contacts) {
  const missingEmail = !validBusinessEmail(contact.email);
  const missingPhone = !validBusinessPhone(contact.phone);
  const required = missingEmail || missingPhone;
  return {
    required, missingEmail, missingPhone,
    reviewRequired: !contact.emailAvailability || !contact.phoneAvailability,
    description: !required ? "Email and phone recorded. Contact permission must still be reviewed separately."
      : missingEmail && missingPhone ? "Both unavailable: Manual contact research required before outreach can proceed."
      : missingEmail ? "Email unavailable: Phone follow-up required to obtain the company's business email."
      : "Phone unavailable: Contact information research required to locate a suitable phone number.",
  };
}

const optionalEmail = z.string().trim().max(254).nullable().optional()
  .transform(value => value === undefined ? undefined : value?.toLowerCase() || null)
  .refine(value => !value || validBusinessEmail(value), "Enter a valid business email address.");
const optionalPhone = z.string().trim().max(50).nullable().optional()
  .transform(value => value === undefined ? undefined : value || null)
  .refine(value => !value || validBusinessPhone(value), "Enter a valid phone number (7–15 digits).");
export const prospectContactSchema = z.object({
  email: optionalEmail,
  phone: optionalPhone,
  emailAvailability: z.enum(contactAvailability).nullable().optional().or(z.literal("").transform(() => null)),
  phoneAvailability: z.enum(contactAvailability).nullable().optional().or(z.literal("").transform(() => null)),
}).superRefine((data, context) => {
  if (data.emailAvailability === "PUBLIC" && !data.email)
    context.addIssue({ code: "custom", path: ["email"], message: "Business email is required when Publicly Accessible is selected." });
  if (data.phoneAvailability === "PUBLIC" && !data.phone)
    context.addIssue({ code: "custom", path: ["phone"], message: "Phone number is required when Publicly Accessible is selected." });
});
