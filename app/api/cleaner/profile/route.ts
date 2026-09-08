import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";
import { prisma } from "@/lib/db";
import { cleanerProfileSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest) {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = cleanerProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid account details." }, { status: 400 });
  const updated = await prisma.cleanerCompany.update({
    where: { id: cleaner.id },
    data: parsed.data,
    select: { companyName: true, contactPerson: true, phone: true, nzbn: true, yearsOperating: true, serviceAreas: true, businessDescription: true, status: true },
  });
  return NextResponse.json({ ok: true, profile: updated });
}
