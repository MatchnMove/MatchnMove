"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BellRing,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  FileCheck2,
  LayoutGrid,
  LoaderCircle,
  MapPinned,
  Menu,
  RadioTower,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { MoverRatingsPanel } from "@/components/mover-ratings-panel";
import { MoverProfileSettings, type MoverProfileState } from "@/components/mover-profile-settings";
import { MoverSecurityPanel } from "@/components/mover-security-panel";
import { MoverLeadTrendsCard } from "@/components/mover-lead-trends-card";
import { cx } from "@/lib/utils";

type DashboardMover = {
  companyName: string;
  businessDescription: string;
  status: string;
  email: string;
  emailVerified: boolean;
  contactPerson: string;
  phone: string;
  nzbn: string;
  yearsOperating: number | null;
  serviceAreas: string[];
  documentsCount: number;
  documents: MoverProfileState["documents"];
  logoUrl: string | null;
  baseLeadPrice: number;
  profileCompletion: number;
  readiness: MoverProfileState["readiness"];
  stats: {
    activeLeads: number;
    purchasedLeads: number;
    wonLeads: number;
    totalLeadValue: number;
    unlockedValue: number;
    averageLeadPrice: number;
  };
  ratings: {
    summary: {
      averageRating: number;
      totalReviewCount: number;
      fiveStarCount: number;
      fourStarCount: number;
      threeStarCount: number;
      twoStarCount: number;
      oneStarCount: number;
      communicationAverage: number;
      punctualityAverage: number;
      careOfBelongingsAverage: number;
      professionalismAverage: number;
      valueForMoneyAverage: number;
      recommendationRate: number;
      leaderboardEligible: boolean;
    } | null;
    pendingCount: number;
    recentReviews: Array<{
      id: string;
      overallRating: number;
      writtenReview: string | null;
      recommendMover: boolean | null;
      communicationRating: number | null;
      punctualityRating: number | null;
      careOfBelongingsRating: number | null;
      professionalismRating: number | null;
      valueForMoneyRating: number | null;
      moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
      isPublic: boolean;
      submittedAt: string;
      customerName: string;
      routeLabel: string;
    }>;
    competition: {
      isRanked: boolean;
      rank: number | null;
      rankedMoverCount: number;
      reviewsNeededToRank: number;
      value: string;
      detail: string;
    };
    leaderboard: Array<{
      id: string;
      companyName: string;
      averageRating: number;
      totalReviewCount: number;
      leaderboardEligible: boolean;
      rank: number | null;
      isCurrentMover: boolean;
    }>;
  };
  leads: Array<{
    id: string;
    status: string;
    price: number;
    createdAt: string;
    purchasedAt: string | null;
    paymentStatus: string;
    paymentReference: string | null;
    lastAction: string | null;
    routeMatch: boolean;
    quoteRequest: {
      id: string;
      name: string;
      email: string;
      phone: string;
      movingWhat: string | null;
      bedrooms: string;
      fromAddress: string;
      fromCity: string;
      fromRegion: string;
      fromPostcode: string;
      toAddress: string;
      toCity: string;
      toRegion: string;
      toPostcode: string;
      fromPropertyType: string;
      toPropertyType: string;
      moveDateLabel: string;
      dateFlexible: boolean;
    };
  }>;
};

const tabs = [
  { id: "overview", label: "Overview", shortLabel: "Home", icon: LayoutGrid },
  { id: "leads", label: "Lead board", shortLabel: "Leads", icon: RadioTower },
  { id: "ratings", label: "Ratings", shortLabel: "Rate", icon: Star },
  { id: "profile", label: "Profile", shortLabel: "Profile", icon: BriefcaseBusiness },
  { id: "payments", label: "Billing", shortLabel: "Bill", icon: CreditCard },
  { id: "security", label: "Security", shortLabel: "Secure", icon: ShieldCheck },
] as const;

const statusTone: Record<string, string> = {
  NEW: "bg-sky-100 text-sky-800",
  NOTIFIED: "bg-indigo-100 text-indigo-800",
  VIEWED: "bg-amber-100 text-amber-800",
  PURCHASED: "bg-emerald-100 text-emerald-800",
  CONTACTED: "bg-violet-100 text-violet-800",
  WON: "bg-teal-100 text-teal-800",
  LOST: "bg-rose-100 text-rose-800",
  ARCHIVED: "bg-slate-200 text-slate-700",
};

const money = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

type BillingResponse = {
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  paymentHealth: "active" | "no_payment_method" | "payment_failed" | "action_required" | "billing_unavailable";
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    leadReference: string;
    description: string;
    receiptAvailable: boolean;
    receiptNumber: string | null;
    receiptUrl: string | null;
    gstAmount: number | null;
  }>;
  receipts: Array<{
    paymentId: string;
    number: string | null;
    date: string;
    totalAmount: number;
    gstAmount: number | null;
    status: string;
    downloadUrl: string | null;
  }>;
  pricingSummary: {
    baseLeadPrice: number;
    factors: string[];
    note: string;
  };
  howItWorks: string[];
  support: {
    email: string;
    billingFaqUrl: string;
    contactUrl: string;
  };
  stripeEnabled: boolean;
};

function formatCurrency(cents: number) {
  return money.format(cents / 100);
}

function formatRelativeDate(value: string) {
  const diffHours = Math.round((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60));
  if (Math.abs(diffHours) < 24) return relative.format(diffHours, "hour");
  return relative.format(Math.round(diffHours / 24), "day");
}

function formatLeadAddress(address: string, city: string, region: string, postcode: string) {
  return [address, city, region, postcode].filter(Boolean).join(", ");
}

const activePipelineStatuses = ["NEW", "NOTIFIED", "VIEWED"] as const;
const unlockedLeadStatuses = ["PURCHASED", "CONTACTED", "WON"] as const;
const wonLeadStatuses = ["WON"] as const;

function isUnlockedStatus(status: string) {
  return unlockedLeadStatuses.includes(status as (typeof unlockedLeadStatuses)[number]);
}

function getLeadStats(profile: DashboardMover) {
  return {
    activeLeads: profile.leads.filter((lead) => activePipelineStatuses.includes(lead.status as (typeof activePipelineStatuses)[number])).length,
    purchasedLeads: profile.leads.filter((lead) => isUnlockedStatus(lead.status)).length,
    wonLeads: profile.leads.filter((lead) => wonLeadStatuses.includes(lead.status as (typeof wonLeadStatuses)[number])).length,
    totalLeadValue: profile.leads.reduce((sum, lead) => sum + lead.price, 0),
    unlockedValue: profile.leads.filter((lead) => isUnlockedStatus(lead.status)).reduce((sum, lead) => sum + lead.price, 0),
    averageLeadPrice: profile.leads.length
      ? Math.round(profile.leads.reduce((sum, lead) => sum + lead.price, 0) / profile.leads.length)
      : profile.baseLeadPrice,
  };
}

export function MoverDashboardExperience({
  mover,
  initialTab,
  billingState,
}: {
  mover: DashboardMover;
  initialTab?: string;
  billingState?: string;
}) {
  const [profile, setProfile] = useState(mover);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    tabs.some((tab) => tab.id === initialTab) ? (initialTab as (typeof tabs)[number]["id"]) : "overview",
  );
  const [profileFocusSection, setProfileFocusSection] = useState<"profile" | "documents" | null>(null);
  const [laneFilter, setLaneFilter] = useState<"all" | "hot" | "open" | "won">("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(mover.leads[0]?.id ?? null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [leadActionMessage, setLeadActionMessage] = useState<string | null>(null);
  const [leadActionError, setLeadActionError] = useState<string | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);

  const filteredLeads = profile.leads.filter((lead) => {
    if (laneFilter === "hot") return ["NEW", "NOTIFIED", "VIEWED"].includes(lead.status);
    if (laneFilter === "open") return ["PURCHASED", "CONTACTED"].includes(lead.status);
    if (laneFilter === "won") return lead.status === "WON";
    return true;
  });

  const selectedLead = filteredLeads.find((lead) => lead.id === selectedLeadId) ?? filteredLeads[0] ?? null;
  const routeFitCount = profile.leads.filter((lead) => lead.routeMatch).length;
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  function openTab(tab: (typeof tabs)[number]["id"]) {
    setActiveTab(tab);
    if (tab !== "profile") setProfileFocusSection(null);
  }

  function openSecurityDestination(destination: "profile" | "documents" | "payments") {
    if (destination === "payments") {
      setProfileFocusSection(null);
      setActiveTab("payments");
      return;
    }

    setActiveTab("profile");
    setProfileFocusSection(destination);
  }

  async function unlockLead(leadId: string) {
    setBusyLeadId(leadId);
    setLeadActionError(null);
    setLeadActionMessage(null);

    try {
      const response = await fetch(`/api/mover/leads/${leadId}/unlock`, {
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as { error?: string; unlockedAt?: string } | null;

      if (!response.ok) {
        setLeadActionError(data?.error ?? "Could not open that lead.");
        return false;
      }

      setProfile((current) => {
        const nextProfile = {
          ...current,
          leads: current.leads.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  status: "PURCHASED",
                  purchasedAt: data?.unlockedAt ?? new Date().toISOString(),
                  paymentStatus: "PENDING",
                  lastAction: "lead_unlocked_for_invoice",
                }
              : lead,
          ),
        };

        return {
          ...nextProfile,
          stats: getLeadStats(nextProfile),
        };
      });

      setLeadActionMessage("Lead opened and queued for month-end invoicing.");
      return true;
    } catch {
      setLeadActionError("Could not open that lead.");
      return false;
    } finally {
      setBusyLeadId(null);
    }
  }

  async function updateLeadStatus(leadId: string, status: "CONTACTED" | "WON" | "LOST" | "ARCHIVED") {
    setBusyLeadId(leadId);
    setLeadActionError(null);
    setLeadActionMessage(null);

    try {
      const response = await fetch(`/api/mover/leads/${leadId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; reviewInviteSent?: boolean; reviewInviteSkippedReason?: string | null }
        | null;

      if (!response.ok) {
        setLeadActionError(data?.error ?? "Could not update that lead.");
        return;
      }

      setProfile((current) => {
        const nextProfile = {
          ...current,
          leads: current.leads.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  status,
                  lastAction: "lead_status_updated",
                }
              : lead,
          ),
        };

        return {
          ...nextProfile,
          stats: getLeadStats(nextProfile),
        };
      });

      if (status === "WON") {
        setLeadActionMessage(
          data?.reviewInviteSent
            ? "Job marked as won and the verified review email has been sent."
            : data?.reviewInviteSkippedReason ?? "Job marked as won.",
        );
      } else {
        setLeadActionMessage(`Lead updated to ${status.toLowerCase()}.`);
      }
    } finally {
      setBusyLeadId(null);
    }
  }

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#eef4fb_0%,#f7f9fc_100%)] px-3 py-3 pb-28 sm:px-4 sm:py-4 sm:pb-32 xl:pb-4">
      <div className="mx-auto max-w-[1600px]">
        <MobileHeader
          mover={profile}
          activeTab={activeTabConfig}
          routeFitCount={routeFitCount}
          isMenuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen((current) => !current)}
          onOpenTab={openTab}
        />

        {isMobileMenuOpen ? (
          <div className="fixed inset-0 z-40 bg-slate-950/30 xl:hidden" aria-hidden="true" onClick={() => setIsMobileMenuOpen(false)} />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="hidden xl:sticky xl:top-4 xl:block xl:h-[calc(100vh-2rem)]">
            <DesktopSidebar mover={profile} activeTab={activeTab} onOpenTab={openTab} />
          </aside>

          <main className="space-y-3 sm:space-y-4">
            {activeTab !== "payments" ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                <TopCard icon={BellRing} label="New demand" value={String(profile.stats.activeLeads)} meta="Needs response" />
                <TopCard icon={BadgeDollarSign} label="Avg lead price" value={formatCurrency(profile.stats.averageLeadPrice)} meta="Billed month end" />
                <TopCard icon={Target} label="Wins" value={String(profile.stats.wonLeads)} meta="Tracked jobs" />
                <TopCard icon={FileCheck2} label="Profile score" value={`${profile.readiness.completion}%`} meta="Trust + readiness" />
              </div>
            ) : null}

            {activeTab === "overview" ? <OverviewPanel mover={profile} routeFitCount={routeFitCount} onOpenTab={openTab} /> : null}
            {activeTab === "leads" ? <LeadsPanel filteredLeads={filteredLeads} laneFilter={laneFilter} onLaneFilterChange={setLaneFilter} selectedLead={selectedLead} selectedLeadId={selectedLeadId} onSelectLead={setSelectedLeadId} onUnlockLead={unlockLead} onUpdateLeadStatus={updateLeadStatus} busyLeadId={busyLeadId} actionMessage={leadActionMessage} actionError={leadActionError} /> : null}
            {activeTab === "ratings" ? <MoverRatingsPanel ratings={profile.ratings} /> : null}
            {activeTab === "profile" ? <ProfilePanel mover={profile} focusSection={profileFocusSection} onFocusHandled={() => setProfileFocusSection(null)} onProfileChange={(nextProfile) => setProfile((current) => ({ ...current, ...nextProfile, documentsCount: nextProfile.documents.length, profileCompletion: nextProfile.readiness.completion }))} /> : null}
            {activeTab === "payments" ? <PaymentsPanel billingState={billingState} /> : null}
            {activeTab === "security" ? <MoverSecurityPanel mover={profile} onOpenDestination={openSecurityDestination} /> : null}
          </main>
        </div>
      </div>

      <MobileNavigation activeTab={activeTab} onOpenTab={openTab} />
    </section>
  );
}

function MobileHeader({
  mover,
  activeTab,
  routeFitCount,
  isMenuOpen,
  onMenuToggle,
  onOpenTab,
}: {
  mover: DashboardMover;
  activeTab: (typeof tabs)[number];
  routeFitCount: number;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onOpenTab: (tab: (typeof tabs)[number]["id"]) => void;
}) {
  return (
    <>
      <div
        className="z-10 mb-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#0a1b2d,#132f4c)] p-3 text-white shadow-[0_20px_48px_-30px_rgba(15,23,42,0.78)] xl:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">{mover.companyName}</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-lg font-black tracking-[-0.04em] text-white">{activeTab.label}</h1>
              <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">{mover.status}</span>
            </div>
          </div>

          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close dashboard menu" : "Open dashboard menu"}
            onClick={onMenuToggle}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MobileMetaPill label="Hot leads" value={String(mover.stats.activeLeads)} />
          <MobileMetaPill label="Route fit" value={String(routeFitCount)} />
          <MobileMetaPill label="Profile" value={`${mover.readiness.completion}%`} />
        </div>
      </div>

      <div
        className={cx(
          "fixed inset-x-3 top-[calc(1rem+env(safe-area-inset-top))] z-50 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#07192a,#102844)] p-4 text-white shadow-[0_30px_70px_-36px_rgba(15,23,42,0.92)] transition-all xl:hidden",
          isMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">
              <Sparkles className="h-3.5 w-3.5" />
              Mover hub
            </div>
            <p className="mt-3 text-xl font-black tracking-[-0.04em] text-white">{mover.companyName}</p>
            <p className="mt-1 text-sm text-slate-300">{mover.contactPerson}</p>
          </div>
          <button
            type="button"
            aria-label="Close dashboard menu"
            onClick={onMenuToggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-4 grid gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onOpenTab(tab.id)}
                className={cx(
                  "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                  activeTab.id === tab.id ? "bg-white text-slate-950" : "bg-white/[0.06] text-slate-100",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            );
          })}
        </nav>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <SidebarStat label="Hot leads" value={String(mover.stats.activeLeads)} />
          <SidebarStat label="Profile" value={`${mover.readiness.completion}%`} />
          <SidebarStat label="Avg lead price" value={formatCurrency(mover.stats.averageLeadPrice)} />
        </div>

        <div className="mt-4 grid gap-2">
          <Link href="/mover/pricing" className="flex items-center justify-between rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]">
            Pricing rules
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => onOpenTab("profile")} className="flex w-full items-center justify-between rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]">
            Update profile
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function MobileMetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.08] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/90">{label}</p>
      <p className="mt-1 text-sm font-black tracking-[-0.03em] text-white">{value}</p>
    </div>
  );
}

function DesktopSidebar({
  mover,
  activeTab,
  onOpenTab,
}: {
  mover: DashboardMover;
  activeTab: (typeof tabs)[number]["id"];
  onOpenTab: (tab: (typeof tabs)[number]["id"]) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#07192a,#102844)] p-4 text-white shadow-[0_28px_90px_-45px_rgba(15,23,42,0.85)] xl:h-full xl:overflow-y-auto">
      <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100">
            <Sparkles className="h-3.5 w-3.5" />
            Mover hub
          </span>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            {mover.status}
          </span>
        </div>
        <p className="mt-4 text-2xl font-black tracking-[-0.05em] text-white">{mover.companyName}</p>
        <p className="mt-1 text-sm text-slate-300">{mover.contactPerson}</p>
      </div>

      <nav className="space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onOpenTab(tab.id)}
              className={cx(
                "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                activeTab === tab.id ? "bg-white text-slate-950" : "bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {tab.label}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          );
        })}
      </nav>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <SidebarStat label="Hot leads" value={String(mover.stats.activeLeads)} />
        <SidebarStat label="Profile" value={`${mover.readiness.completion}%`} />
        <SidebarStat label="Avg lead price" value={formatCurrency(mover.stats.averageLeadPrice)} />
      </div>

      <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-4 xl:mt-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">Fast actions</p>
        <div className="mt-3 space-y-2">
          <Link href="/mover/pricing" className="flex items-center justify-between rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]">
            Pricing rules
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => onOpenTab("leads")} className="flex w-full items-center justify-between rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]">
            Work leads
            <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onOpenTab("profile")} className="flex w-full items-center justify-between rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]">
            Update profile
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileNavigation({
  activeTab,
  onOpenTab,
}: {
  activeTab: (typeof tabs)[number]["id"];
  onOpenTab: (tab: (typeof tabs)[number]["id"]) => void;
}) {
  return (
    <nav
      aria-label="Mover dashboard sections"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/98 shadow-[0_-16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur xl:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="hide-scrollbar flex overflow-x-auto overscroll-x-contain whitespace-nowrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onOpenTab(tab.id)}
              className={cx(
                "flex min-w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 border-r border-slate-200 px-3 py-3 text-[11px] font-semibold transition",
                isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function OverviewPanel({ mover, routeFitCount, onOpenTab }: { mover: DashboardMover; routeFitCount: number; onOpenTab: (value: (typeof tabs)[number]["id"]) => void }) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid gap-3 sm:gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Today</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950 sm:text-3xl">Dispatch board</h2>
            </div>
            <button type="button" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Refresh view
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ActionTile title="Route matches" value={`${routeFitCount}`} meta="Good fit" />
            <ActionTile title="Unlocked" value={`${mover.stats.purchasedLeads}`} meta="Active jobs" />
          <ActionTile title="Coverage regions" value={`${mover.serviceAreas.length}`} meta="NZ regions selected" />
            <ActionTile title="Docs" value={`${mover.documentsCount}`} meta="On file" />
          </div>
          <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3 lg:grid-cols-3">
            <JumpCard title="Lead board" action="Open leads" onClickLabel="Go" onClick={() => onOpenTab("leads")} />
            <JumpCard title="Pricing" action="Check costs" href="/mover/pricing" />
            <JumpCard title="Profile" action="Tighten trust" onClickLabel="Edit" onClick={() => onOpenTab("profile")} />
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-3 2xl:grid-cols-1">
          <CompactCard icon={MapPinned} title="Coverage" value={`${routeFitCount}/${mover.leads.length || 0}`} meta="fit leads" />
          <CompactCard icon={Clock3} title="Phone" value={mover.phone} meta="lead callback line" />
          <CompactCard icon={CheckCircle2} title="Email" value={mover.emailVerified ? "Verified" : "Pending"} meta={mover.email} />
        </div>
      </div>

      <MoverLeadTrendsCard leads={mover.leads} />
    </div>
  );
}

type LeadsPanelProps = {
  filteredLeads: DashboardMover["leads"];
  laneFilter: "all" | "hot" | "open" | "won";
  onLaneFilterChange: (value: "all" | "hot" | "open" | "won") => void;
  selectedLead: DashboardMover["leads"][number] | null;
  selectedLeadId: string | null;
  onSelectLead: (value: string) => void;
  onUnlockLead: (leadId: string) => Promise<boolean>;
  onUpdateLeadStatus: (leadId: string, status: "CONTACTED" | "WON" | "LOST" | "ARCHIVED") => void;
  busyLeadId: string | null;
  actionMessage: string | null;
  actionError: string | null;
};

function LeadsPanel({
  filteredLeads,
  laneFilter,
  onLaneFilterChange,
  selectedLead,
  selectedLeadId,
  onSelectLead,
  onUnlockLead,
  onUpdateLeadStatus,
  busyLeadId,
  actionMessage,
  actionError,
}: LeadsPanelProps) {
  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  const filters: Array<{ id: LeadsPanelProps["laneFilter"]; label: string }> = [
    { id: "all", label: "All" },
    { id: "hot", label: "Hot" },
    { id: "open", label: "Open" },
    { id: "won", label: "Won" },
  ];

  function focusSelectedLead(leadId: string) {
    onSelectLead(leadId);

    window.requestAnimationFrame(() => {
      const panel = detailPanelRef.current;
      if (!panel) return;

      const rect = panel.getBoundingClientRect();
      const isFullyVisible = rect.top >= 16 && rect.bottom <= window.innerHeight - 16;
      if (!isFullyVisible) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  async function handleUnlockLead(leadId: string) {
    const didUnlock = await onUnlockLead(leadId);
    if (!didUnlock) return;

    window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="grid gap-3 sm:gap-4 2xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
      <div className="order-2 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[30px] sm:p-4 2xl:order-1">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button key={filter.id} type="button" onClick={() => onLaneFilterChange(filter.id)} className={cx("rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4", laneFilter === filter.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
              {filter.label}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
          {filteredLeads.length ? filteredLeads.map((lead) => (
            <button key={lead.id} type="button" onClick={() => focusSelectedLead(lead.id)} className={cx("w-full rounded-[20px] border p-3 text-left transition sm:rounded-[24px] sm:p-4", selectedLeadId === lead.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
              <div className="flex items-center justify-between gap-2">
                <span className={cx("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-[11px]", statusTone[lead.status] ?? "bg-slate-100 text-slate-700")}>{lead.status}</span>
                <span className="text-[11px] font-semibold text-slate-500 sm:text-xs">{formatRelativeDate(lead.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-950 sm:mt-3 sm:text-base">{lead.quoteRequest.fromCity} to {lead.quoteRequest.toCity}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500 sm:text-xs">
                <span>{lead.quoteRequest.bedrooms}</span>
                <span>{formatCurrency(lead.price)}</span>
                <span>{lead.routeMatch ? "Match" : "Check route"}</span>
              </div>
            </button>
          )) : <EmptyCard title="No leads in this filter" />}
        </div>
      </div>

      <div ref={detailPanelRef} className="order-1 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5 2xl:order-2">
        {selectedLead ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Selected lead</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950 sm:text-3xl">{selectedLead.quoteRequest.fromCity} to {selectedLead.quoteRequest.toCity}</h2>
              </div>
              <span className={cx("rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-xs", statusTone[selectedLead.status] ?? "bg-slate-100 text-slate-700")}>{selectedLead.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ActionTile title="Move size" value={selectedLead.quoteRequest.bedrooms} meta="home size" />
              <ActionTile title="Move date" value={selectedLead.quoteRequest.moveDateLabel} meta={selectedLead.quoteRequest.dateFlexible ? "flexible" : "fixed"} />
              <ActionTile title="Property" value={selectedLead.quoteRequest.fromPropertyType} meta={`to ${selectedLead.quoteRequest.toPropertyType}`} />
              <ActionTile title="Lead price" value={formatCurrency(selectedLead.price)} meta={selectedLead.paymentStatus === "SUCCEEDED" ? "paid" : "invoice later"} />
            </div>
            <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3 md:grid-cols-2">
              <StatusChip label="Coverage" value={selectedLead.routeMatch ? "Good fit" : "Manual review"} good={selectedLead.routeMatch} />
              <StatusChip label="Last activity" value={selectedLead.lastAction ? selectedLead.lastAction.replaceAll("_", " ") : "No events yet"} good={false} />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:gap-3 sm:flex-row">
              {isUnlockedStatus(selectedLead.status) ? (
                <div className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 sm:min-h-[52px] sm:px-5">Lead open</div>
              ) : (
                <div className="flex-1">
                  <button type="button" disabled={busyLeadId === selectedLead.id} onClick={() => void handleUnlockLead(selectedLead.id)} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-accentOrange px-4 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[52px] sm:px-5">
                    {busyLeadId === selectedLead.id ? "Opening lead..." : "Open lead now"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              <Link href="/mover/pricing" className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:min-h-[52px] sm:px-5">Pricing</Link>
            </div>
            {actionError ? (
              <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {actionError}
              </div>
            ) : null}
            {actionMessage ? (
              <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {actionMessage}
              </div>
            ) : null}
            {isUnlockedStatus(selectedLead.status) ? (
              <div className="mt-4 grid gap-3 sm:mt-5 sm:gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4 sm:rounded-[24px] sm:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 sm:text-sm">Customer details</p>
                  <div className="mt-3 space-y-3">
                    <StatusChip label="Customer" value={selectedLead.quoteRequest.name} good />
                    <StatusChip label="Phone" value={selectedLead.quoteRequest.phone} good />
                    <StatusChip label="Email" value={selectedLead.quoteRequest.email} good />
                  </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 sm:rounded-[24px] sm:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Move details</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <StatusChip label="Moving" value={selectedLead.quoteRequest.movingWhat ?? "General household move"} />
                    <StatusChip label="Opened on" value={selectedLead.purchasedAt ? new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(new Date(selectedLead.purchasedAt)) : "Available now"} />
                    <StatusChip label="Pickup" value={formatLeadAddress(selectedLead.quoteRequest.fromAddress, selectedLead.quoteRequest.fromCity, selectedLead.quoteRequest.fromRegion, selectedLead.quoteRequest.fromPostcode)} />
                    <StatusChip label="Dropoff" value={formatLeadAddress(selectedLead.quoteRequest.toAddress, selectedLead.quoteRequest.toCity, selectedLead.quoteRequest.toRegion, selectedLead.quoteRequest.toPostcode)} />
                  </div>
                </div>
              </div>
            ) : null}
            {isUnlockedStatus(selectedLead.status) ? (
              <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4 sm:mt-5 sm:rounded-[24px] sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Move progress</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { id: "CONTACTED", label: "Mark contacted" },
                    { id: "WON", label: "Mark won + send review" },
                    { id: "LOST", label: "Mark lost" },
                    { id: "ARCHIVED", label: "Archive" },
                  ].map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={busyLeadId === selectedLead.id || selectedLead.status === action.id}
                      onClick={() => onUpdateLeadStatus(selectedLead.id, action.id as "CONTACTED" | "WON" | "LOST" | "ARCHIVED")}
                      className={cx(
                        "rounded-full px-4 py-2 text-sm font-semibold transition",
                        selectedLead.status === action.id
                          ? "bg-slate-900 text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                        busyLeadId === selectedLead.id ? "opacity-60" : "",
                      )}
                    >
                      {busyLeadId === selectedLead.id && selectedLead.status !== action.id ? "Updating..." : action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : <EmptyCard title="Pick a lead to work it" />}
      </div>
    </div>
  );
}

function ProfilePanel({
  mover,
  onProfileChange,
  focusSection,
  onFocusHandled,
}: {
  mover: DashboardMover;
  onProfileChange: (profile: MoverProfileState) => void;
  focusSection?: "profile" | "documents" | null;
  onFocusHandled?: () => void;
}) {
  return <MoverProfileSettings profile={mover} onProfileChange={onProfileChange} focusSection={focusSection} onFocusHandled={onFocusHandled} />;
}

function PaymentsPanel({ billingState }: { billingState?: string }) {
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentMethodBusy, setPaymentMethodBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    (async () => {
      const response = await fetch("/api/mover/billing", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as BillingResponse & { error?: string } | null;

      if (!active) return;

      if (!response.ok || !data) {
        setError(data?.error ?? "Could not load billing details.");
        setBilling(null);
        setIsLoading(false);
        return;
      }

      setBilling(data);
      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  async function openPaymentMethodFlow() {
    setPaymentMethodBusy(true);
    setActionError(null);

    try {
      const response = await fetch("/api/mover/billing/payment-method-session", {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
      if (!response.ok || !data?.url) {
        setActionError(data?.error ?? "Could not open billing setup.");
        return;
      }

      window.location.href = data.url;
    } finally {
      setPaymentMethodBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:min-h-[320px] sm:rounded-[30px] sm:p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading billing details...
        </div>
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="rounded-[24px] border border-rose-200 bg-white p-5 shadow-sm sm:rounded-[30px] sm:p-6">
        <div className="flex items-center gap-3 text-rose-700">
          <AlertTriangle className="h-5 w-5" />
          <p className="font-semibold">{error ?? "Could not load billing details."}</p>
        </div>
      </div>
    );
  }

  const statusMessage =
    billing.paymentHealth === "active"
      ? "Billing is set up and a card is available if you want faster invoice settlement."
      : billing.paymentHealth === "action_required"
        ? "A billing action needs attention before future invoice payments can be processed."
      : billing.paymentHealth === "payment_failed"
        ? "A recent billing payment failed. Update your card so invoice payments do not get delayed."
        : billing.paymentHealth === "no_payment_method"
          ? "No card is on file. That is optional for lead access, but useful if you want quicker invoice settlement."
          : "Billing automation is not configured for this environment.";

  return (
    <div className="space-y-3 sm:space-y-4">
      {(billingState === "updated" || billing.paymentHealth === "payment_failed" || billing.paymentHealth === "action_required" || actionError) ? (
        <div className={cx("rounded-[22px] border p-3 shadow-sm sm:rounded-[28px] sm:p-4", actionError ? "border-rose-200 bg-rose-50" : billing.paymentHealth === "active" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
          <p className={cx("text-sm font-semibold", actionError ? "text-rose-700" : billing.paymentHealth === "active" ? "text-emerald-700" : "text-amber-800")}>
            {actionError ?? (billingState === "updated" ? "Payment method updated successfully." : statusMessage)}
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Billing method</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Card on file</h2>
            </div>
            <button
              type="button"
              onClick={openPaymentMethodFlow}
              disabled={paymentMethodBusy || !billing.stripeEnabled}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px] disabled:opacity-60"
            >
              {paymentMethodBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}
              {!billing.paymentMethod ? "Add card" : "Update card"}
            </button>
          </div>

          <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:mt-4 sm:rounded-[24px] sm:p-4">
            {billing.paymentMethod ? (
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                <StatusChip label="Brand" value={billing.paymentMethod.brand.toUpperCase()} good />
                <StatusChip label="Card" value={`**** ${billing.paymentMethod.last4}`} good />
                <StatusChip label="Expires" value={`${billing.paymentMethod.expMonth}/${billing.paymentMethod.expYear}`} good />
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-slate-900">No card on file</p>
                  <p className="mt-1 text-sm text-slate-600">Lead access still works without a card. Add one if you want invoice payments to be easier later.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Invoice status</p>
          <div className={cx("mt-3 rounded-[20px] border p-3 sm:mt-4 sm:rounded-[24px] sm:p-4", billing.paymentHealth === "active" ? "border-emerald-200 bg-emerald-50" : billing.paymentHealth === "billing_unavailable" || billing.paymentHealth === "no_payment_method" ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50")}>
            <p className="font-semibold text-slate-900">{statusMessage}</p>
            {billing.paymentHealth !== "active" && billing.paymentHealth !== "billing_unavailable" && billing.paymentHealth !== "no_payment_method" ? (
              <button
                type="button"
                onClick={openPaymentMethodFlow}
                disabled={paymentMethodBusy}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px] disabled:opacity-60"
              >
                {paymentMethodBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {billing.paymentMethod ? "Replace card" : "Add a card"}
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Charge history</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Lead charges</h2>
          </div>
        </div>

        {billing.transactions.length ? (
          <>
          <div className="mt-3 space-y-2 md:hidden">
            {billing.transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{transaction.leadReference}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(new Date(transaction.date))}</p>
                  </div>
                  <span className={cx("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", transaction.status === "paid" ? "bg-emerald-100 text-emerald-700" : transaction.status === "issue" ? "bg-rose-100 text-rose-700" : transaction.status === "refunded" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800")}>
                    {transaction.status}
                  </span>
                </div>
                <p className="mt-3 text-lg font-black tracking-[-0.04em] text-slate-950">{formatCurrency(transaction.amount)}</p>
                <p className="mt-1 text-sm text-slate-600">{transaction.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Lead</th>
                  <th className="pb-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {billing.transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t border-slate-200">
                    <td className="py-3 pr-4 text-slate-700">{new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(new Date(transaction.date))}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{formatCurrency(transaction.amount)}</td>
                    <td className="py-3 pr-4">
                      <span className={cx("rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]", transaction.status === "paid" ? "bg-emerald-100 text-emerald-700" : transaction.status === "issue" ? "bg-rose-100 text-rose-700" : transaction.status === "refunded" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800")}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{transaction.leadReference}</td>
                    <td className="py-3 text-slate-700">{transaction.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="mt-3 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center sm:mt-4 sm:rounded-[24px] sm:py-8">
            <p className="font-semibold text-slate-900">No charges yet</p>
            <p className="mt-2 text-sm text-slate-500">Unlocked leads queued for invoicing will appear here once your team starts opening opportunities.</p>
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Invoices and receipts</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Invoices and receipts</h2>
            </div>
          </div>
          <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
            {billing.receipts.length ? (
              billing.receipts.map((receipt) => (
                <div key={receipt.paymentId} className="flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[24px] sm:p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{receipt.number ?? "Stripe receipt"}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(new Date(receipt.date))} | {formatCurrency(receipt.totalAmount)} | GST {receipt.gstAmount === null ? "not itemised" : formatCurrency(receipt.gstAmount)}
                    </p>
                  </div>
                  {receipt.downloadUrl ? (
                    <a href={receipt.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">
                      View receipt
                    </a>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center sm:rounded-[24px] sm:py-8">
                <p className="font-semibold text-slate-900">No documents yet</p>
                <p className="mt-2 text-sm text-slate-500">Invoices or payment receipts will appear here once billing documents are available.</p>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-3 sm:space-y-4">
          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Pricing summary</p>
            <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
              <StatusChip label="Base lead price" value={formatCurrency(billing.pricingSummary.baseLeadPrice)} good />
              <StatusChip label="Pricing factors" value={billing.pricingSummary.factors.join(", ")} />
              <StatusChip label="Billing note" value={billing.pricingSummary.note} good />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#081a2b,#102845)] p-4 text-white shadow-sm sm:rounded-[30px] sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200 sm:text-sm">How billing works</p>
            <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
              {billing.howItWorks.map((step, index) => (
                <FlowRow key={step} number={String(index + 1).padStart(2, "0")} title={step} />
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
            <div className="flex items-center gap-2">
              <CircleHelp className="h-5 w-5 text-slate-700" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Billing help</p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950 sm:text-xl">Need help?</h2>
              </div>
            </div>
            <div className="mt-3 space-y-2 sm:mt-4">
              <a href={`mailto:${billing.support.email}`} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Email billing support
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link href={billing.support.billingFaqUrl} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Billing FAQ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100 sm:text-[11px]">{label}</p><p className="mt-1 text-sm font-black text-white sm:mt-2 sm:text-lg">{value}</p></div>;
}

function TopCard({ icon: Icon, label, value, meta }: { icon: typeof BellRing; label: string; value: string; meta: string }) {
  return <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[28px] sm:p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{label}</p><p className="mt-2 text-xl font-black tracking-[-0.05em] text-slate-950 sm:mt-3 sm:text-3xl">{value}</p></div><div className="rounded-xl bg-slate-100 p-2.5 text-slate-700 sm:rounded-2xl sm:p-3"><Icon className="h-4 w-4" /></div></div><p className="mt-1 text-xs text-slate-500 sm:text-sm">{meta}</p></div>;
}

function ActionTile({ title, value, meta }: { title: string; value: string; meta: string }) {
  return <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[24px] sm:p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{title}</p><p className="mt-1.5 break-words text-base font-black tracking-[-0.04em] text-slate-950 sm:mt-2 sm:text-lg">{value}</p><p className="mt-1 text-xs text-slate-500 sm:text-sm">{meta}</p></div>;
}

function CompactCard({ icon: Icon, title, value, meta }: { icon: typeof MapPinned; title: string; value: string; meta: string }) {
  return <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5"><div className="inline-flex rounded-xl bg-sky-100 p-2.5 text-sky-700 sm:rounded-2xl sm:p-3"><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></div><p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:mt-4 sm:text-xs">{title}</p><p className="mt-1.5 break-words text-xl font-black tracking-[-0.05em] text-slate-950 sm:mt-2 sm:text-2xl">{value}</p><p className="mt-1 text-xs text-slate-500 sm:text-sm">{meta}</p></div>;
}

function StatusChip({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return <div className={cx("rounded-[20px] border p-3 sm:rounded-[24px] sm:p-4", good ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{label}</p><p className="mt-1.5 break-words text-sm font-semibold text-slate-900 sm:mt-2">{value}</p></div>;
}

function JumpCard({ title, action, href, onClickLabel, onClick }: { title: string; action: string; href?: string; onClickLabel?: string; onClick?: () => void }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[24px] sm:p-4">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{action}</p>
      {href ? <Link href={href} className="mt-3 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white sm:mt-4">{onClickLabel ?? "Open"}</Link> : <button type="button" onClick={onClick} className="mt-3 inline-flex rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white sm:mt-4">{onClickLabel ?? "Ready"}</button>}
    </div>
  );
}

function FlowRow({ number, title }: { number: string; title: string }) {
  return <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.06] px-3 py-3 sm:gap-4 sm:rounded-[24px] sm:px-4 sm:py-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-white sm:h-10 sm:w-10 sm:rounded-2xl">{number}</div><p className="text-sm font-semibold text-white sm:text-base">{title}</p></div>;
}

function EmptyCard({ title }: { title: string }) {
  return <div className="flex min-h-[180px] items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center sm:min-h-[240px] sm:rounded-[24px] sm:p-6"><p className="font-semibold text-slate-600">{title}</p></div>;
}
