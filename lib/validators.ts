import { z } from "zod";
import { NZ_SERVICE_AREAS, sanitiseNzServiceAreas } from "@/lib/nz-regions";

export const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
});

export const quoteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  fromPropertyType: z.string(),
  toPropertyType: z.string(),
  bedrooms: z.string(),
  fromAddress: z.string().min(3),
  fromCity: z.string().min(2),
  fromRegion: z.string().min(2),
  fromPostcode: z.string().min(2),
  fromCountry: z.string().min(2),
  toAddress: z.string().min(3),
  toCity: z.string().min(2),
  toRegion: z.string().min(2),
  toPostcode: z.string().min(2),
  toCountry: z.string().min(2),
  moveDate: z.string().optional().nullable(),
  dateFlexible: z.boolean().default(false),
  movingWhat: z.string().optional().nullable(),
  transcriptRaw: z.any().optional(),
  transcriptFields: z.any().optional(),
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a number");

const phonePattern = /^[+\d][\d\s()-]{6,24}$/;
const nzbnPattern = /^\d{13}$/;
export const moverLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const moverRegisterSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name"),
    companyName: z.string().trim().min(2, "Enter your company name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z.string().trim().min(7, "Enter a valid phone number"),
    password: passwordSchema,
    confirmPassword: z.string(),
    serviceAreas: z.array(z.enum(NZ_SERVICE_AREAS)).min(1, "Choose at least one coverage region"),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and privacy policy" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const moverGoogleSchema = z.object({
  credential: z.string().min(1, "Missing Google credential"),
});

export const moverForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const moverResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Missing reset token"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const moverChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const moverResendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const moverProfileSchema = z.object({
  contactPerson: z.string().trim().min(2, "Enter a contact name").max(80, "Contact name is too long"),
  phone: z
    .string()
    .trim()
    .regex(phonePattern, "Enter a valid phone number")
    .transform((value) => value.replace(/\s+/g, " ")),
  nzbn: z
    .string()
    .trim()
    .regex(nzbnPattern, "NZBN must be 13 digits")
    .optional()
    .or(z.literal(""))
    .transform((value) => value || null),
  yearsOperating: z
    .union([z.number(), z.string()])
    .transform((value) => (typeof value === "number" ? value : value.trim() === "" ? null : Number(value)))
    .refine((value) => value === null || (Number.isInteger(value) && value >= 0 && value <= 200), "Years operating must be between 0 and 200"),
  serviceAreas: z
    .array(z.enum(NZ_SERVICE_AREAS))
    .min(1, "Choose at least one coverage region")
    .max(NZ_SERVICE_AREAS.length, "Too many coverage regions selected"),
  businessDescription: z
    .string()
    .max(800, "Business description must be 800 characters or less")
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (!value) return null;

      const normalized = value
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/g, ""))
        .join("\n")
        .replace(/\n[ \t]+\n/g, "\n\n")
        .trim();

      return normalized.length ? normalized : null;
    }),
});

export const moverLogoSchema = z.object({
  logoUrl: z.string().trim().min(1, "A logo is required"),
});

export const moverDocumentTypeSchema = z.enum(["INSURANCE", "NZBN_PROOF", "LICENCE", "OTHER"]);

export const moverDocumentUploadSchema = z.object({
  type: moverDocumentTypeSchema,
  fileName: z
    .string()
    .trim()
    .min(1, "A file name is required")
    .max(120, "File name is too long")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._ -]*$/, "Use a safe file name"),
  fileDataUrl: z.string().trim().min(1, "A file is required"),
});

const optionalRatingSchema = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined || value === null || value === "") return null;
    return typeof value === "number" ? value : Number(value);
  })
  .refine((value) => value === null || (Number.isInteger(value) && value >= 1 && value <= 5), "Ratings must be between 1 and 5");

export const reviewSubmissionSchema = z.object({
  token: z.string().trim().min(1, "Missing review token"),
  overallRating: z
    .union([z.number(), z.string()])
    .transform((value) => (typeof value === "number" ? value : Number(value)))
    .refine((value) => Number.isInteger(value) && value >= 1 && value <= 5, "Overall rating must be between 1 and 5"),
  writtenReview: z
    .string()
    .max(2000, "Review must be 2000 characters or less")
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;

      const normalized = value
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();

      return normalized.length ? normalized : null;
    }),
  communicationRating: optionalRatingSchema,
  punctualityRating: optionalRatingSchema,
  careOfBelongingsRating: optionalRatingSchema,
  professionalismRating: optionalRatingSchema,
  valueForMoneyRating: optionalRatingSchema,
  recommendMover: z
    .union([z.boolean(), z.string()])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined || value === null || value === "") return null;
      if (typeof value === "boolean") return value;
      return value === "yes" ? true : value === "no" ? false : null;
    }),
  showReviewerName: z
    .union([z.boolean(), z.string()])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined || value === null || value === "") return true;
      if (typeof value === "boolean") return value;

      return !["false", "0", "anonymous", "hide", "hidden", "no"].includes(value.trim().toLowerCase());
    }),
});

export const leadStatusUpdateSchema = z.object({
  status: z.enum(["CONTACTED", "WON", "LOST", "ARCHIVED"]),
});

export function sanitiseServiceAreas(serviceAreas: string[]) {
  return sanitiseNzServiceAreas(serviceAreas);
}

export function sanitiseFileName(fileName: string) {
  return fileName.replace(/[\\/:"*?<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

export function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const base64 = match[2];
  const fileSize = Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

  return { mimeType, base64, fileSize };
}
