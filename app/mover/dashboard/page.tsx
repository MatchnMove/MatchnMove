import { redirect } from "next/navigation";
import { MoverDashboardExperience } from "@/components/mover-dashboard-experience";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEAD_PRICING } from "@/lib/lead-pricing";
import { calculateMoverProfileReadiness } from "@/lib/mover-profile";
import { canonicaliseServiceArea, sanitiseNzServiceAreas } from "@/lib/nz-regions";
import { getMoverCompetitionSnapshot, getMoverLeaderboard, getMoverRatingsDashboardData } from "@/lib/reviews";

function formatDate(value: Date | null) {
  if (!value) return "Flexible timing";

  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function matchesServiceArea(serviceAreas: string[], lead: { fromCity: string; fromRegion: string; toCity: string; toRegion: string }) {
  if (!serviceAreas.length) return false;

  const coverage = new Set(sanitiseNzServiceAreas(serviceAreas));
  const leadRegions = [lead.fromRegion, lead.toRegion]
    .map((region) => canonicaliseServiceArea(region))
    .filter((region): region is NonNullable<typeof region> => Boolean(region));

  return leadRegions.some((region) => coverage.has(region));
}

export default async function MoverDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; billing?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/mover/login");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const mover = await prisma.moverCompany.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      documents: true,
      leads: {
        orderBy: { createdAt: "desc" },
        include: {
          payment: true,
          auditLogs: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          quoteRequest: true,
        },
      },
    },
  });

  if (!mover) {
    return (
      <section className="min-h-screen bg-slate-100 px-4 py-16">
        <div className="container-shell">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">No mover profile found</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Your account is signed in, but there is no mover company linked to it yet. Finish registration to unlock the
              full dashboard.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const [ratingsData, leaderboard] = await Promise.all([
    getMoverRatingsDashboardData(mover.id),
    getMoverLeaderboard(mover.id),
  ]);
  const competition = getMoverCompetitionSnapshot(mover.id, ratingsData.summary, leaderboard);
  const moverServiceAreas = sanitiseNzServiceAreas(mover.serviceAreas);

  const completionChecks = [
    Boolean(mover.companyName),
    Boolean(mover.nzbn),
    Boolean(mover.yearsOperating),
    Boolean(mover.contactPerson),
    Boolean(mover.phone),
    moverServiceAreas.length > 0,
    Boolean(mover.logoUrl),
    mover.documents.length > 0,
    Boolean(mover.user.emailVerifiedAt),
  ];

  const profileCompletion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);
  const activePipelineStatuses = ["NEW", "NOTIFIED", "VIEWED"] as const;
  const wonStatuses = ["WON"] as const;
  const purchasedStatuses = ["PURCHASED", "CONTACTED", "WON"] as const;
  const totalLeadValue = mover.leads.reduce((sum, lead) => sum + lead.price, 0);
  const unlockedValue = mover.leads
    .filter((lead) => purchasedStatuses.includes(lead.status as (typeof purchasedStatuses)[number]))
    .reduce((sum, lead) => sum + lead.price, 0);

  const dashboardData = {
    companyName: mover.companyName,
    businessDescription: mover.businessDescription ?? "",
    status: mover.status,
    email: mover.user.email,
    emailVerified: Boolean(mover.user.emailVerifiedAt),
    contactPerson: mover.contactPerson ?? "Add your lead contact",
    phone: mover.phone ?? "Add your phone number",
    nzbn: mover.nzbn ?? "Add your NZBN",
    yearsOperating: mover.yearsOperating,
    serviceAreas: moverServiceAreas,
    documentsCount: mover.documents.length,
    documents: mover.documents.map((document) => ({
      id: document.id,
      type: document.type,
      fileName: document.fileName ?? "Document",
      mimeType: document.mimeType ?? null,
      fileSize: document.fileSize ?? null,
      viewUrl: `/api/mover/profile/documents/${document.id}/file`,
      createdAt: document.createdAt.toISOString(),
    })),
    logoUrl: mover.logoUrl,
    baseLeadPrice: LEAD_PRICING.basePrice,
    profileCompletion,
    readiness: calculateMoverProfileReadiness(mover),
    stats: {
      activeLeads: mover.leads.filter((lead) => activePipelineStatuses.includes(lead.status as (typeof activePipelineStatuses)[number])).length,
      purchasedLeads: mover.leads.filter((lead) => purchasedStatuses.includes(lead.status as (typeof purchasedStatuses)[number])).length,
      wonLeads: mover.leads.filter((lead) => wonStatuses.includes(lead.status as (typeof wonStatuses)[number])).length,
      totalLeadValue,
      unlockedValue,
      averageLeadPrice: mover.leads.length ? Math.round(totalLeadValue / mover.leads.length) : LEAD_PRICING.basePrice,
    },
    ratings: {
      ...ratingsData,
      competition,
      leaderboard,
    },
    leads: mover.leads.map((lead) => ({
      id: lead.id,
      status: lead.status,
      price: lead.price,
      createdAt: lead.createdAt.toISOString(),
      purchasedAt: lead.purchasedAt?.toISOString() ?? null,
      paymentStatus: lead.payment?.status ?? "PENDING",
      paymentReference: lead.payment?.stripeCheckoutId ?? null,
      lastAction: lead.auditLogs[0]?.action ?? null,
      routeMatch: matchesServiceArea(moverServiceAreas, lead.quoteRequest),
      quoteRequest: {
        id: lead.quoteRequest.id,
        name: lead.quoteRequest.name,
        email: lead.quoteRequest.email,
        phone: lead.quoteRequest.phone,
        movingWhat: lead.quoteRequest.movingWhat,
        bedrooms: lead.quoteRequest.bedrooms,
        fromAddress: lead.quoteRequest.fromAddress,
        fromCity: lead.quoteRequest.fromCity,
        fromRegion: lead.quoteRequest.fromRegion,
        fromPostcode: lead.quoteRequest.fromPostcode,
        toAddress: lead.quoteRequest.toAddress,
        toCity: lead.quoteRequest.toCity,
        toRegion: lead.quoteRequest.toRegion,
        toPostcode: lead.quoteRequest.toPostcode,
        fromPropertyType: lead.quoteRequest.fromPropertyType,
        toPropertyType: lead.quoteRequest.toPropertyType,
        moveDateLabel: formatDate(lead.quoteRequest.moveDate),
        dateFlexible: lead.quoteRequest.dateFlexible,
      },
    })),
  };

  return <MoverDashboardExperience mover={dashboardData} initialTab={resolvedSearchParams?.tab} billingState={resolvedSearchParams?.billing} />;
}
