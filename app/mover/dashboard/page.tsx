import { redirect } from "next/navigation";
import { MoverDashboardExperience } from "@/components/mover-dashboard-experience";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEAD_PRICING } from "@/lib/lead-pricing";
import { serializeMoverLeadQuoteRequest } from "@/lib/mover-lead-visibility";
import { calculateMoverProfileReadiness, isPhoneVerificationRequired } from "@/lib/mover-profile";
import { canonicaliseServiceArea, sanitiseNzServiceAreas } from "@/lib/nz-regions";
import { getMoverLaunchTrialSetting } from "@/lib/platform-settings";
import { getMoverCompetitionSnapshot, getMoverLeaderboard, getMoverRatingsDashboardData } from "@/lib/reviews";

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
  searchParams?: Promise<{ tab?: string; billing?: string; lead?: string }>;
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

  const [ratingsData, leaderboard, launchTrial] = await Promise.all([
    getMoverRatingsDashboardData(mover.id),
    getMoverLeaderboard(mover.id),
    getMoverLaunchTrialSetting(),
  ]);
  const competition = getMoverCompetitionSnapshot(mover.id, ratingsData.summary, leaderboard);
  const moverServiceAreas = sanitiseNzServiceAreas(mover.serviceAreas);

  const readiness = calculateMoverProfileReadiness(mover);
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
    phoneVerifiedAt: mover.phoneVerifiedAt?.toISOString() ?? null,
    phoneVerificationRequired: isPhoneVerificationRequired(),
    authorizedRepresentativeName: mover.authorizedRepresentativeName ?? "",
    authorizedRepresentativeRole: mover.authorizedRepresentativeRole ?? "",
    authorityDeclaredAt: mover.authorityDeclaredAt?.toISOString() ?? null,
    nzbn: mover.nzbn ?? "Add your NZBN",
    nzbnVerificationStatus: mover.nzbnVerificationStatus,
    nzbnRegisteredName: mover.nzbnRegisteredName,
    nzbnEntityStatus: mover.nzbnEntityStatus,
    nzbnVerifiedAt: mover.nzbnVerifiedAt?.toISOString() ?? null,
    nzbnVerificationError: mover.nzbnVerificationError,
    yearsOperating: mover.yearsOperating,
    serviceAreas: moverServiceAreas,
    documentsCount: mover.documents.length,
    documents: mover.documents.map((document) => ({
      id: document.id,
      type: document.type,
      fileName: document.fileName ?? "Document",
      mimeType: document.mimeType ?? null,
      fileSize: document.fileSize ?? null,
      verificationStatus: document.verificationStatus,
      verificationNote: document.verificationNote,
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
      reviewedBy: document.reviewedBy,
      expiresAt: document.expiresAt?.toISOString() ?? null,
      scanStatus: document.scanStatus,
      detectedMimeType: document.detectedMimeType,
      viewUrl: `/api/mover/profile/documents/${document.id}/file`,
      createdAt: document.createdAt.toISOString(),
    })),
    logoUrl: mover.logoUrl,
    baseLeadPrice: LEAD_PRICING.basePrice,
    launchTrial,
    profileCompletion: readiness.completion,
    readiness,
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
      expiresAt: lead.expiresAt?.toISOString() ?? null,
      reminderSentAt: lead.reminderSentAt?.toISOString() ?? null,
      expiredAt: lead.expiredAt?.toISOString() ?? null,
      redistributedAt: lead.redistributedAt?.toISOString() ?? null,
      redistributionRound: lead.redistributionRound,
      paymentStatus: lead.payment?.status ?? "PENDING",
      paymentReference: lead.payment?.stripeCheckoutId ?? null,
      lastAction: lead.auditLogs[0]?.action ?? null,
      routeMatch: matchesServiceArea(moverServiceAreas, lead.quoteRequest),
      quoteRequest: serializeMoverLeadQuoteRequest(
        mover.status === "ACTIVE" && readiness.isLive ? lead.status : "VERIFICATION_REQUIRED",
        lead.quoteRequest,
      ),
    })),
  };

  return (
    <MoverDashboardExperience
      mover={dashboardData}
      initialTab={resolvedSearchParams?.tab}
      initialLeadId={resolvedSearchParams?.lead}
      billingState={resolvedSearchParams?.billing}
    />
  );
}
