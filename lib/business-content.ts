import { prisma } from "@/lib/db";
import { z } from "zod";
export const businessContentSchema = z.object({
  operatorName: z.string().trim().max(160).default(""),
  registrationNumber: z.string().trim().max(40).default(""),
  introduction: z.string().trim().max(1600).default(""),
  team: z.string().trim().max(1600).default(""),
});
export async function getBusinessContent() {
  try {
    const row = await prisma.recruitmentSetting.findUnique({
      where: { key: "public-business-content" },
    });
    return businessContentSchema.parse(row?.value ?? {});
  } catch {
    return businessContentSchema.parse({});
  }
}
