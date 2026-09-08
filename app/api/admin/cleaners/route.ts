import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getCleanerBillingPeriod } from "@/lib/cleaner-billing";
import { prisma } from "@/lib/db";

const statusUpdateSchema = z.object({
  cleanerId: z.string().trim().min(1),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE"]),
});

function serialiseInvoice(invoice: {
  id: string;
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  leadCount: number;
  subtotal: number;
  gstAmount: number | null;
  total: number;
  currency: string;
  status: string;
  invoiceNumber: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  issuedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
}) {
  return {
    ...invoice,
    periodStart: invoice.periodStart.toISOString(),
    periodEnd: invoice.periodEnd.toISOString(),
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    dueAt: invoice.dueAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
  };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentPeriod = getCleanerBillingPeriod();
  const cleaners = await prisma.cleanerCompany.findMany({
    include: {
      user: { select: { email: true, emailVerifiedAt: true } },
      invoices: {
        orderBy: [{ periodStart: "desc" }, { id: "desc" }],
        take: 18,
        select: {
          id: true,
          periodKey: true,
          periodStart: true,
          periodEnd: true,
          leadCount: true,
          subtotal: true,
          gstAmount: true,
          total: true,
          currency: true,
          status: true,
          invoiceNumber: true,
          hostedInvoiceUrl: true,
          invoicePdfUrl: true,
          issuedAt: true,
          dueAt: true,
          paidAt: true,
        },
      },
      _count: { select: { leads: true, purchases: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    currentPeriod: {
      key: currentPeriod.key,
      start: currentPeriod.start.toISOString(),
      end: currentPeriod.end.toISOString(),
    },
    cleaners: cleaners.map((cleaner) => {
      const invoices = cleaner.invoices.map(serialiseInvoice);
      const currentInvoice = invoices.find((invoice) => invoice.periodKey === currentPeriod.key) ?? null;
      const outstandingInvoices = invoices.filter((invoice) => ["OPEN", "SENT", "OVERDUE"].includes(invoice.status));

      return {
        id: cleaner.id,
        companyName: cleaner.companyName,
        contactPerson: cleaner.contactPerson,
        email: cleaner.user.email,
        emailVerified: Boolean(cleaner.user.emailVerifiedAt),
        serviceAreas: cleaner.serviceAreas,
        status: cleaner.status,
        createdAt: cleaner.createdAt.toISOString(),
        totalLeads: cleaner._count.leads,
        totalUnlocked: cleaner._count.purchases,
        currentInvoice,
        outstandingBalance: outstandingInvoices.reduce((total, invoice) => total + invoice.total, 0),
        outstandingInvoiceCount: outstandingInvoices.length,
        invoices,
      };
    }),
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = statusUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid status update." }, { status: 400 });
  }

  const existing = await prisma.cleanerCompany.findUnique({
    where: { id: parsed.data.cleanerId },
    select: { id: true, companyName: true, status: true, user: { select: { emailVerifiedAt: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Cleaner company not found." }, { status: 404 });
  if (parsed.data.status === "ACTIVE" && !existing.user.emailVerifiedAt) {
    return NextResponse.json({ error: "Verify the cleaner email address before activation." }, { status: 400 });
  }

  const cleaner = await prisma.$transaction(async (tx) => {
    const updated = await tx.cleanerCompany.update({
      where: { id: existing.id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });
    await tx.adminAuditLog.create({
      data: {
        actorId: admin.reviewerId,
        action: "cleaner_status_updated",
        meta: {
          cleanerCompanyId: existing.id,
          companyName: existing.companyName,
          previousStatus: existing.status,
          nextStatus: parsed.data.status,
          reviewerId: admin.reviewerId,
        },
      },
    });
    return updated;
  });

  return NextResponse.json({ ok: true, cleaner });
}
