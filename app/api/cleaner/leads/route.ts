import { CleaningLeadStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
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

const cleaningLeadStatuses = new Set<string>(Object.values(CleaningLeadStatus));

export async function GET(request: NextRequest) {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: privateNoStoreHeaders },
    );
  }

  const requestedStatus = request.nextUrl.searchParams.get("status")?.trim().toUpperCase();
  if (requestedStatus && requestedStatus !== "ALL" && !cleaningLeadStatuses.has(requestedStatus)) {
    return NextResponse.json(
      { error: "Invalid cleaning lead status." },
      { status: 400, headers: privateNoStoreHeaders },
    );
  }

  const leads = await prisma.cleaningLead.findMany({
    where: {
      cleanerCompanyId: cleaner.id,
      ...(requestedStatus && requestedStatus !== "ALL"
        ? { status: requestedStatus as CleaningLeadStatus }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: cleaningLeadForCleanerSelect,
  });

  return NextResponse.json(
    leads.map((lead) => serializeCleaningLeadForCleaner(lead, {
      // Admin deactivation immediately revokes dashboard access to stored PII,
      // while keeping privacy-safe lead and billing history visible.
      revealCustomerDetails: cleaner.status === "ACTIVE",
    })),
    { headers: privateNoStoreHeaders },
  );
}
