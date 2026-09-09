import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";
import { hasCleanerServiceRegions } from "@/lib/cleaner-readiness";
import { prisma } from "@/lib/db";
import { cleanerProfileSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest) {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = cleanerProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid account details." }, { status: 400 });
  const hasRegions = hasCleanerServiceRegions(parsed.data.serviceAreas);
  const regionsError = "Keep at least one service region selected while your cleaner profile is live.";
  if (cleaner.status === "ACTIVE" && !hasRegions) {
    return NextResponse.json({ error: regionsError }, { status: 400 });
  }
  try {
    const updated = await prisma.cleanerCompany.update({
      // Check the current status atomically in case an admin activates a draft
      // while its owner is saving their profile without regions.
      where: { id: cleaner.id, ...(!hasRegions ? { status: { not: "ACTIVE" } } : {}) },
      data: parsed.data,
      select: { companyName: true, contactPerson: true, phone: true, nzbn: true, yearsOperating: true, serviceAreas: true, businessDescription: true, status: true },
    });
    return NextResponse.json({ ok: true, profile: updated });
  } catch (error) {
    if (!hasRegions && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: regionsError }, { status: 400 });
    }
    throw error;
  }
}
