import { z } from "zod";
export const CLEANING_SERVICES = {
  END_OF_TENANCY: "End-of-tenancy cleaning",
  MOVE_OUT: "General move-out cleaning",
  DEEP: "Deep cleaning",
  OVEN: "Oven cleaning",
  CARPET: "Carpet cleaning",
  WINDOWS: "Window cleaning",
  KITCHEN_BATHROOM: "Kitchen and bathroom cleaning",
  MOVE_IN: "Move-in cleaning",
  OTHER: "Other requirements",
} as const;
export const cleaningDetailsSchema = z
  .object({
    location: z.enum(["MOVE_OUT", "MOVE_IN"]).default("MOVE_OUT"),
    services: z
      .array(
        z.enum([
          "END_OF_TENANCY",
          "MOVE_OUT",
          "DEEP",
          "OVEN",
          "CARPET",
          "WINDOWS",
          "KITCHEN_BATHROOM",
          "MOVE_IN",
          "OTHER",
        ]),
      )
      .max(9)
      .transform((v) => [...new Set(v)])
      .default([]),
    destinationConsent: z.boolean().default(false),
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    timeWindow: z
      .enum(["FLEXIBLE", "MORNING", "AFTERNOON", "EVENING"])
      .default("FLEXIBLE"),
    propertyEmpty: z.enum(["YES", "NO", "UNSURE"]).default("UNSURE"),
    moverTiming: z.enum(["BEFORE", "AFTER", "UNSURE"]).default("UNSURE"),
    accessNotes: z.string().trim().max(1000).default(""),
    carpetRooms: z.number().int().min(1).max(50).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.location === "MOVE_IN" && !v.destinationConsent)
      ctx.addIssue({
        code: "custom",
        path: ["destinationConsent"],
        message:
          "Authorise sharing the destination property for move-in cleaning.",
      });
    if (v.location === "MOVE_OUT" && v.services.includes("MOVE_IN"))
      ctx.addIssue({
        code: "custom",
        path: ["services"],
        message: "Choose the destination property for move-in cleaning.",
      });
    if (v.preferredDate) {
      const d = new Date(v.preferredDate + "T12:00:00Z");
      if (
        Number.isNaN(d.getTime()) ||
        d.toISOString().slice(0, 10) !== v.preferredDate
      )
        ctx.addIssue({
          code: "custom",
          path: ["preferredDate"],
          message: "Enter a valid cleaning date.",
        });
    }
  });
export type CleaningDetails = z.input<typeof cleaningDetailsSchema>;
type Quote = {
  fromAddress: string;
  fromCity: string;
  fromRegion: string;
  fromPostcode: string;
  fromPropertyType: string;
  bedrooms: string;
  toAddress: string;
  toCity: string;
  toRegion: string;
  toPostcode: string;
  toPropertyType: string;
  toBedrooms?: string | null;
};
export function buildCleaningSnapshot(
  quote: Quote,
  details: z.output<typeof cleaningDetailsSchema>,
  consentAt: Date,
) {
  const into = details.location === "MOVE_IN";
  return {
    location: details.location,
    services: details.services,
    targetAddress: into ? quote.toAddress : quote.fromAddress,
    targetCity: into ? quote.toCity : quote.fromCity,
    targetRegion: into ? quote.toRegion : quote.fromRegion,
    targetPostcode: into ? quote.toPostcode : quote.fromPostcode,
    propertyType: into ? quote.toPropertyType : quote.fromPropertyType,
    bedrooms: into ? quote.toBedrooms || null : quote.bedrooms,
    preferredDate: details.preferredDate
      ? new Date(details.preferredDate + "T12:00:00Z")
      : null,
    timeWindow: details.timeWindow,
    propertyEmpty: details.propertyEmpty,
    moverTiming: details.moverTiming,
    accessNotes: details.accessNotes || null,
    carpetRooms: details.services.includes("CARPET")
      ? (details.carpetRooms ?? null)
      : null,
    destinationConsentAt: into ? consentAt : null,
  };
}

const choiceLabels: Record<string, string> = {
  FLEXIBLE: "Flexible / not confirmed",
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
  YES: "Yes",
  NO: "No",
  UNSURE: "Not confirmed",
  BEFORE: "Before movers",
  AFTER: "After movers",
};
export function formatCleaningChoice(value: string | null | undefined) {
  return choiceLabels[value ?? ""] ?? "Not confirmed";
}
