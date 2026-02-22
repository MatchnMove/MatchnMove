import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10).max(2000)
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
  transcriptFields: z.any().optional()
});
