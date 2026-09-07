import { redirect } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { AdminNavigation } from "@/components/admin-navigation";
import {
  AdminQuoteFlowPanel,
  type AdminMoverQuoteSummary,
  type AdminQuoteFlowSummary,
  type AdminUnmatchedQuote,
} from "@/components/admin-quote-flow-panel";
import { getMoverQuoteFlowPage } from "@/lib/admin-quote-flow";
import { isAdminUser } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminQuoteFlowPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/mover/login?next=/admin/quote-flow");
  if (!isAdminUser(session.user)) redirect("/mover/dashboard");
  if (!session.user.mfaVerified) redirect("/admin/mfa?next=/admin/quote-flow");

  const [
    moverRecords,
    statusRows,
    quoteRequestCount,
    assignmentCount,
    emailStatusRows,
    unmatchedQuoteCount,
    unmatchedQuoteRecords,
  ] = await Promise.all([
    prisma.moverCompany.findMany({
      select: {
        id: true,
        companyName: true,
        status: true,
        serviceAreas: true,
        user: {
          select: { email: true },
        },
        _count: {
          select: { leads: true },
        },
        leads: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            quoteRequestId: true,
            createdAt: true,
            quoteRequest: {
              select: {
                fromCity: true,
                fromRegion: true,
                toCity: true,
                toRegion: true,
              },
            },
          },
        },
      },
      orderBy: [{ companyName: "asc" }, { id: "asc" }],
    }),
    prisma.lead.groupBy({
      by: ["moverCompanyId", "status"],
      _count: { _all: true },
    }),
    prisma.quoteRequest.count(),
    prisma.lead.count(),
    prisma.emailDelivery.groupBy({
      by: ["status"],
      where: {
        kind: { in: ["mover_new_lead", "mover_lead_expiry_warning"] },
      },
      _count: { _all: true },
    }),
    prisma.quoteRequest.count({
      where: { leads: { none: {} } },
    }),
    prisma.quoteRequest.findMany({
      where: { leads: { none: {} } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 6,
      select: {
        id: true,
        createdAt: true,
        fromCity: true,
        fromRegion: true,
        toCity: true,
        toRegion: true,
        moveDate: true,
        dateFlexible: true,
      },
    }),
  ]);

  const statusCountsByMover = new Map<string, Record<string, number>>();
  for (const row of statusRows) {
    const counts = statusCountsByMover.get(row.moverCompanyId) ?? {};
    counts[row.status] = row._count._all;
    statusCountsByMover.set(row.moverCompanyId, counts);
  }

  const movers: AdminMoverQuoteSummary[] = moverRecords.map((mover) => {
    const latest = mover.leads[0];

    return {
      id: mover.id,
      companyName: mover.companyName,
      email: mover.user.email,
      accountStatus: mover.status,
      serviceAreas: mover.serviceAreas,
      assignmentCount: mover._count.leads,
      statusCounts: statusCountsByMover.get(mover.id) ?? {},
      latestAssignment: latest
        ? {
            assignedAt: latest.createdAt.toISOString(),
            quoteRequestId: latest.quoteRequestId,
            fromCity: latest.quoteRequest.fromCity,
            fromRegion: latest.quoteRequest.fromRegion,
            toCity: latest.quoteRequest.toCity,
            toRegion: latest.quoteRequest.toRegion,
          }
        : null,
    };
  }).sort((left, right) => {
    if (left.latestAssignment && right.latestAssignment) {
      return right.latestAssignment.assignedAt.localeCompare(left.latestAssignment.assignedAt)
        || left.companyName.localeCompare(right.companyName);
    }
    if (left.latestAssignment) return -1;
    if (right.latestAssignment) return 1;
    return left.companyName.localeCompare(right.companyName);
  });

  const emailCounts = Object.fromEntries(emailStatusRows.map((row) => [row.status, row._count._all]));
  const trackedEmailCount = emailStatusRows.reduce((total, row) => total + row._count._all, 0);
  const sentEmailCount = emailCounts.SENT ?? 0;
  const summary: AdminQuoteFlowSummary = {
    moverCount: movers.length,
    quoteRequestCount,
    assignmentCount,
    unmatchedQuoteCount,
    trackedEmailCount,
    sentEmailCount,
    emailAttentionCount: trackedEmailCount - sentEmailCount,
  };
  const recentUnmatchedQuotes: AdminUnmatchedQuote[] = unmatchedQuoteRecords.map((quote) => ({
    id: quote.id,
    createdAt: quote.createdAt.toISOString(),
    fromCity: quote.fromCity,
    fromRegion: quote.fromRegion,
    toCity: quote.toCity,
    toRegion: quote.toRegion,
    moveDate: quote.moveDate?.toISOString() ?? null,
    dateFlexible: quote.dateFlexible,
  }));
  const initialMoverId = movers.find((mover) => mover.assignmentCount > 0)?.id ?? movers[0]?.id ?? null;
  const initialPage = initialMoverId
    ? await getMoverQuoteFlowPage(initialMoverId)
    : { items: [], nextCursor: null };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef4fb_0%,#f7f9fc_100%)] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Admin operations</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">Quote flow</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                See which quote requests were assigned to each mover, whether each notification was accepted for delivery, and whether the mover viewed the lead—without accessing their account.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <AdminNavigation current="quote-flow" />
              <AdminLogoutButton className="shrink-0" />
            </div>
          </div>
        </header>

        <AdminQuoteFlowPanel
          movers={movers}
          summary={summary}
          recentUnmatchedQuotes={recentUnmatchedQuotes}
          initialMoverId={initialMoverId}
          initialPage={initialPage}
        />
      </div>
    </main>
  );
}
