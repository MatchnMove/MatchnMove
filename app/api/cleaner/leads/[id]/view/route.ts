import { CleaningLeadStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";
import {
  cleaningLeadForCleanerSelect,
  serializeCleaningLeadForCleaner,
} from "@/lib/cleaner-lead-visibility";
import { prisma } from "@/lib/db";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};
const previewStatuses = [CleaningLeadStatus.NEW, CleaningLeadStatus.NOTIFIED] as const;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: privateNoStoreHeaders },
    );
  }
  if (cleaner.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "This cleaner account is not active and cannot view new leads." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }

  const { id } = await params;
  const existing = await prisma.cleaningLead.findFirst({
    where: { id, cleanerCompanyId: cleaner.id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Cleaning lead not found." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.cleaningLead.updateMany({
      where: {
        id: existing.id,
        cleanerCompanyId: cleaner.id,
        status: { in: [...previewStatuses] },
      },
      data: {
        status: CleaningLeadStatus.VIEWED,
        viewedAt: now,
      },
    });

    if (claim.count === 1) {
      await tx.cleaningLeadAuditLog.create({
        data: {
          cleaningLeadId: existing.id,
          action: "cleaning_lead_viewed_in_dashboard",
          meta: {
            cleanerCompanyId: cleaner.id,
            viewedAt: now.toISOString(),
          },
        },
      });
    }

    const lead = await tx.cleaningLead.findFirst({
      where: { id: existing.id, cleanerCompanyId: cleaner.id },
      select: cleaningLeadForCleanerSelect,
    });
    return { lead, newlyViewed: claim.count === 1 };
  });

  if (!result.lead) {
    return NextResponse.json(
      { error: "Cleaning lead not found." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      newlyViewed: result.newlyViewed,
      lead: serializeCleaningLeadForCleaner(result.lead),
    },
    { headers: privateNoStoreHeaders },
  );
}
