import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";
import { canCleanerAccessLeads } from "@/lib/cleaner-readiness";
import {
  cleaningLeadForCleanerSelect,
  serializeCleaningLeadForCleaner,
} from "@/lib/cleaner-lead-visibility";
import { prisma } from "@/lib/db";
import { cleanerLeadStatusUpdateSchema } from "@/lib/validators";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: privateNoStoreHeaders },
    );
  }
  if (!canCleanerAccessLeads(cleaner)) {
    return NextResponse.json(
      { error: "An active cleaner account with saved service regions is required to update leads." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }

  const parsed = cleanerLeadStatusUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid cleaning lead status." },
      { status: 400, headers: privateNoStoreHeaders },
    );
  }

  const { id } = await params;
  const existing = await prisma.cleaningLead.findFirst({
    where: { id, cleanerCompanyId: cleaner.id },
    select: {
      id: true,
      status: true,
      purchase: { select: { id: true } },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Cleaning lead not found." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  }
  if (!existing.purchase) {
    return NextResponse.json(
      { error: "Unlock this cleaning lead before updating its progress." },
      { status: 400, headers: privateNoStoreHeaders },
    );
  }

  const nextStatus = parsed.data.status;
  const result = await prisma.$transaction(async (tx) => {
    if (existing.status !== nextStatus) {
      await tx.cleaningLead.updateMany({
        where: {
          id: existing.id,
          cleanerCompanyId: cleaner.id,
          purchase: { isNot: null },
        },
        data: { status: nextStatus },
      });
      await tx.cleaningLeadAuditLog.create({
        data: {
          cleaningLeadId: existing.id,
          action: "cleaning_lead_status_updated",
          meta: {
            cleanerCompanyId: cleaner.id,
            fromStatus: existing.status,
            toStatus: nextStatus,
          },
        },
      });
    }

    return tx.cleaningLead.findFirst({
      where: { id: existing.id, cleanerCompanyId: cleaner.id },
      select: cleaningLeadForCleanerSelect,
    });
  });

  if (!result) {
    return NextResponse.json(
      { error: "Cleaning lead not found." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      lead: serializeCleaningLeadForCleaner(result),
    },
    { headers: privateNoStoreHeaders },
  );
}
