"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CircleUserRound,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Home,
  Inbox,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/components/language-provider";
import { CleanerLeadTrendsCard } from "@/components/cleaner-lead-trends-card";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { CLEANING_LEAD_PRICING } from "@/lib/cleaner-lead-pricing";
import { NZ_SERVICE_AREA_GROUPS } from "@/lib/nz-regions";

type DashboardSection = "overview" | "leads" | "billing" | "account";

type CleanerProfile = {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  emailVerified: boolean;
  nzbn: string;
  yearsOperating: number | null;
  serviceAreas: string[];
  businessDescription: string;
  status: string;
};

type CleaningLead = {
  id: string;
  status: string;
  unlocked: boolean;
  customerAccessSuspended: boolean;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  viewedAt: string | null;
  purchasedAt: string | null;
  cleaning: {
    location: string;
    notes: string | null;
    propertyType: string;
    bedrooms: string;
    generalLocation: string;
    moveDate: string | null;
    dateFlexible: boolean;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    region: string;
    postcode: string;
  } | null;
};

type InvoiceSummary = {
  id: string;
  periodKey?: string;
  periodStart?: string;
  periodEnd?: string;
  status: string;
  leadCount: number;
  subtotal: number;
  gstAmount: number | null;
  total: number;
  currency?: string;
  invoiceNumber?: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  documentAvailable?: boolean;
  documentUrl?: string | null;
  issuedAt?: string | null;
  sentAt?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  purchases?: Array<{
    id: string;
    cleaningLeadId: string;
    amount: number;
    currency: string;
    status: string;
    purchasedAt: string;
    generalLocation: string;
  }>;
};

type BillingSummary = {
  currentPeriod?: { key: string; start: string; end: string; nextPeriodStart: string };
  nextInvoiceAt?: string;
  pricePerLead?: number;
  currency?: string;
  currentInvoice: InvoiceSummary | null;
  invoiceHistory: InvoiceSummary[];
};

type Notice = { type: "success" | "error"; message: string } | null;

const dashboardSections = [
  { id: "overview", icon: Home, labelKey: "dashboard.overview" },
  { id: "leads", icon: Inbox, labelKey: "dashboard.leads" },
  { id: "billing", icon: ReceiptText, labelKey: "dashboard.billing" },
  { id: "account", icon: CircleUserRound, labelKey: "dashboard.account" },
] as const;

const accountInputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brandBlue focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100";

const leadStatusStyles: Record<string, string> = {
  NEW: "bg-sky-100 text-sky-800",
  NOTIFIED: "bg-indigo-100 text-indigo-800",
  VIEWED: "bg-amber-100 text-amber-800",
  PURCHASED: "bg-emerald-100 text-emerald-800",
  CONTACTED: "bg-violet-100 text-violet-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-rose-100 text-rose-800",
  ARCHIVED: "bg-slate-200 text-slate-700",
};

const invoiceStatusStyles: Record<string, string> = {
  UPCOMING: "bg-sky-100 text-sky-800",
  OPEN: "bg-amber-100 text-amber-800",
  SENT: "bg-indigo-100 text-indigo-800",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-rose-100 text-rose-800",
  VOID: "bg-slate-200 text-slate-700",
};

function isDashboardSection(value: string | undefined): value is DashboardSection {
  return dashboardSections.some((section) => section.id === value);
}

function displayStatus(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function useDialogFocus<T extends HTMLElement>(active = true) {
  const dialogRef = useRef<T | null>(null);
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const frame = window.requestAnimationFrame(() => dialog?.querySelector<HTMLElement>(selector)?.focus());
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(selector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", trapFocus);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("keydown", trapFocus); previous?.focus(); };
  }, [active]);
  return dialogRef;
}

function LeadStatus({ status }: { status: string }) {
  const { t } = useLanguage();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${leadStatusStyles[status] ?? "bg-slate-100 text-slate-700"}`}>{t(`status.${status}`)}</span>;
}

function DashboardNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div role={notice.type === "error" ? "alert" : "status"} className={`fixed inset-x-4 top-4 z-[80] mx-auto flex max-w-2xl items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <span className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice.message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss message" className="rounded-lg p-1 hover:bg-black/5"><X className="h-4 w-4" /></button>
    </div>
  );
}

export function CleanerDashboardExperience({
  initialProfile,
  initialSection,
  initialLeadId,
}: {
  initialProfile: CleanerProfile;
  initialSection?: string;
  initialLeadId?: string;
}) {
  const { t, formatCurrency, formatDate, formatNumber } = useLanguage();
  const [profile, setProfile] = useState(initialProfile);
  const [section, setSectionState] = useState<DashboardSection>(isDashboardSection(initialSection) ? initialSection : "overview");
  const [leads, setLeads] = useState<CleaningLead[]>([]);
  const [billing, setBilling] = useState<BillingSummary>({ currentInvoice: null, invoiceHistory: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedLead, setSelectedLead] = useState<CleaningLead | null>(null);
  const [unlockLead, setUnlockLead] = useState<CleaningLead | null>(null);
  const [busyLeadId, setBusyLeadId] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [leadFilter, setLeadFilter] = useState("ALL");

  const loadBilling = useCallback(async () => {
    const response = await fetch("/api/cleaner/billing", { cache: "no-store" });
    if (response.status === 401) {
      window.location.replace("/cleaner/login?next=%2Fcleaner%2Fdashboard");
      return null;
    }
    if (!response.ok) return null;
    return (await response.json()) as BillingSummary;
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [leadResponse, billingData] = await Promise.all([
        fetch("/api/cleaner/leads", { cache: "no-store" }),
        loadBilling(),
      ]);
      if (leadResponse.status === 401) {
        window.location.replace("/cleaner/login?next=%2Fcleaner%2Fdashboard");
        return;
      }
      const leadData = (await leadResponse.json().catch(() => null)) as CleaningLead[] | { leads?: CleaningLead[]; error?: string } | null;
      if (!leadResponse.ok) {
        setLoadError(!Array.isArray(leadData) && leadData?.error ? leadData.error : t("cleanerDashboard.loadError"));
        return;
      }
      setLeads(Array.isArray(leadData) ? leadData : leadData?.leads ?? []);
      if (billingData) setBilling(billingData);
    } catch {
      setLoadError(t("cleanerAuth.common.serverError"));
    } finally {
      setLoading(false);
    }
  }, [loadBilling, t]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!initialLeadId || !leads.length || selectedLead) return;
    const lead = leads.find((item) => item.id === initialLeadId);
    if (lead) void openLeadDetails(lead);
  // Only consume the deep link once after the list arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLeadId, leads.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (unlockLead) setUnlockLead(null);
      else if (selectedLead) setSelectedLead(null);
      else setMobileMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedLead, unlockLead]);

  const metrics = useMemo(() => {
    const unlocked = leads.filter((lead) => lead.unlocked);
    const won = leads.filter((lead) => lead.status === "WON");
    const spend = unlocked.reduce((total, lead) => total + lead.price, 0);
    return {
      received: leads.length,
      opened: unlocked.length,
      won: won.length,
      spend,
      conversion: unlocked.length ? Math.round((won.length / unlocked.length) * 100) : 0,
      costPerWon: won.length ? Math.round(spend / won.length) : 0,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (leadFilter === "ALL") return leads;
    if (leadFilter === "AVAILABLE") return leads.filter((lead) => !lead.unlocked);
    if (leadFilter === "OPENED") return leads.filter((lead) => lead.unlocked);
    return leads.filter((lead) => lead.status === leadFilter);
  }, [leadFilter, leads]);

  function changeSection(nextSection: DashboardSection) {
    setSectionState(nextSection);
    setMobileMenuOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("section", nextSection);
    url.searchParams.delete("lead");
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  }

  function replaceLead(nextLead: CleaningLead) {
    setLeads((current) => current.map((lead) => (lead.id === nextLead.id ? nextLead : lead)));
    setSelectedLead((current) => (current?.id === nextLead.id ? nextLead : current));
  }

  async function openLeadDetails(lead: CleaningLead) {
    setSelectedLead(lead);
    if (lead.viewedAt || lead.unlocked || profile.status !== "ACTIVE") return;
    setBusyLeadId(lead.id);
    try {
      const response = await fetch(`/api/cleaner/leads/${encodeURIComponent(lead.id)}/view`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { lead?: CleaningLead; newlyViewed?: boolean; error?: string };
      if (response.ok && data.lead) {
        replaceLead(data.lead);
        if (data.newlyViewed) {
          trackAnalyticsEvent("cleaner_lead_viewed", { dashboard_type: "cleaner" });
        }
      }
    } catch {
      // The preview already contains every field safe to show, so a failed view receipt is non-blocking.
    } finally {
      setBusyLeadId("");
    }
  }

  async function confirmUnlock() {
    if (!unlockLead) return;
    const leadId = unlockLead.id;
    setBusyLeadId(leadId);
    try {
      const response = await fetch(`/api/cleaner/leads/${encodeURIComponent(leadId)}/unlock`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { lead?: CleaningLead; error?: string; message?: string; alreadyPurchased?: boolean; invoice?: InvoiceSummary };
      if (!response.ok || !data.lead) {
        setNotice({ type: "error", message: data.error || t("cleanerDashboard.openError") });
        return;
      }
      replaceLead(data.lead);
      setSelectedLead(data.lead);
      setUnlockLead(null);
      trackAnalyticsEvent("cleaner_lead_unlocked", {
        dashboard_type: "cleaner",
        amount: data.lead.price,
        currency: data.lead.currency,
      });
      setNotice({
        type: "success",
        message: data.alreadyPurchased
          ? t("cleanerDashboard.alreadyOpenedNotice")
          : t("cleanerDashboard.openedNotice", { price: formatCurrency(data.lead.price) }),
      });
      const updatedBilling = await loadBilling();
      if (updatedBilling) setBilling(updatedBilling);
    } catch {
      setNotice({ type: "error", message: t("cleanerDashboard.openConnectionError") });
    } finally {
      setBusyLeadId("");
    }
  }

  async function updateLeadStatus(lead: CleaningLead, status: string) {
    setBusyLeadId(lead.id);
    try {
      const response = await fetch(`/api/cleaner/leads/${encodeURIComponent(lead.id)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json().catch(() => ({}))) as { lead?: CleaningLead; error?: string };
      if (!response.ok || !data.lead) {
        setNotice({ type: "error", message: data.error || t("cleanerDashboard.statusError") });
        return;
      }
      replaceLead(data.lead);
      trackAnalyticsEvent("cleaner_lead_status_changed", {
        dashboard_type: "cleaner",
        from_status: lead.status,
        to_status: status,
      });
      setNotice({ type: "success", message: t("cleanerDashboard.statusUpdated", { status: displayStatus(status).toLowerCase() }) });
    } catch {
      setNotice({ type: "error", message: t("cleanerDashboard.statusTryAgain") });
    } finally {
      setBusyLeadId("");
    }
  }

  async function logout() {
    await fetch("/api/cleaner/logout", { method: "POST" }).catch(() => undefined);
    window.location.replace("/cleaner/login");
  }

  const statusMessage = profile.status === "ACTIVE"
    ? null
    : profile.status === "SUSPENDED" || profile.status === "INACTIVE"
      ? t("cleanerDashboard.statusPaused")
      : t("cleanerDashboard.statusReview");

  return (
    <div className="min-h-screen bg-[#f2f6fb] text-slate-950">
      <DashboardNotice notice={notice} onClose={() => setNotice(null)} />

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-[68px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileMenuOpen((current) => !current)} aria-label={mobileMenuOpen ? t("cleanerDashboard.menuClose") : t("cleanerDashboard.menuOpen")} aria-expanded={mobileMenuOpen} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brandBlue text-white shadow-sm"><Sparkles className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black tracking-[-0.02em] text-slate-950 sm:text-base">Match &apos;n Move</span>
                <span className="block truncate text-[0.67rem] font-bold uppercase tracking-[0.15em] text-sky-700">{t("cleanerDashboard.portal")}</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector compact className="sm:hidden" />
            <LanguageSelector className="hidden sm:inline-flex" />
            <div className="hidden max-w-[14rem] text-right md:block">
              <p className="truncate text-sm font-bold text-slate-900">{profile.companyName}</p>
              <p className="truncate text-xs text-slate-500">{profile.email}</p>
            </div>
            <button type="button" onClick={() => void logout()} title={t("dashboard.logout")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
              <LogOut className="h-4.5 w-4.5" /><span className="sr-only">{t("dashboard.logout")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-68px)]">
        <aside className={`${mobileMenuOpen ? "fixed inset-x-4 top-[76px] z-40 block rounded-[24px] shadow-2xl" : "hidden"} h-fit border border-slate-200 bg-[#0c2330] p-3 text-white lg:sticky lg:top-[68px] lg:block lg:h-[calc(100vh-68px)] lg:w-64 lg:shrink-0 lg:rounded-none lg:border-0 lg:p-5`}>
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200"><Building2 className="h-5 w-5" /></span>
              <span className={`rounded-full px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] ${profile.status === "ACTIVE" ? "bg-emerald-300 text-emerald-950" : "bg-amber-200 text-amber-950"}`}>{t(`status.${profile.status}`)}</span>
            </div>
            <p className="mt-3 truncate text-sm font-bold">{profile.companyName}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{profile.serviceAreas.length} {profile.serviceAreas.length === 1 ? t("cleanerDashboard.serviceRegion") : t("cleanerDashboard.serviceRegionsCount")}</p>
          </div>
          <nav className="grid gap-1" aria-label={t("cleanerDashboard.ariaLabel")}>
            {dashboardSections.map(({ id, icon: Icon, labelKey }) => (
              <button key={id} type="button" onClick={() => changeSection(id)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${section === id ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                <Icon className={`h-4.5 w-4.5 ${section === id ? "text-brandBlue" : "text-slate-400"}`} />
                {t(labelKey)}
                {id === "leads" && leads.some((lead) => lead.status === "NEW") ? <span className="ml-auto rounded-full bg-orange-400 px-2 py-0.5 text-[0.65rem] font-black text-slate-950">{leads.filter((lead) => lead.status === "NEW").length}</span> : null}
              </button>
            ))}
          </nav>
          <div className="mt-4 border-t border-white/10 pt-4">
            <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"><ArrowRight className="h-4 w-4 rotate-180" />{t("cleanerDashboard.backToSite")}</Link>
            <button type="button" onClick={() => void logout()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-red-400/10 hover:text-red-200"><LogOut className="h-4 w-4" />{t("dashboard.logout")}</button>
          </div>
        </aside>

        {mobileMenuOpen ? <button type="button" aria-label="Close dashboard menu" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" /> : null}

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            {statusMessage ? (
              <div className="mb-5 flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">{t("cleanerDashboard.accountStatus", { status: t(`status.${profile.status}`) })}</p><p className="mt-0.5">{statusMessage}</p></div>
              </div>
            ) : null}
            {loadError ? (
              <div className="mb-5 flex items-center justify-between gap-4 rounded-[22px] border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{loadError}</p><button type="button" onClick={() => void loadDashboard()} className="shrink-0 rounded-xl bg-red-700 px-4 py-2 font-bold text-white">{t("cleanerDashboard.tryAgain")}</button></div>
            ) : null}

            {section === "overview" ? (
              <OverviewSection profile={profile} metrics={metrics} leads={leads} billing={billing} loading={loading} onShowLeads={() => changeSection("leads")} onOpenLead={(lead) => void openLeadDetails(lead)} formatCurrency={formatCurrency} formatDate={formatDate} formatNumber={formatNumber} />
            ) : null}
            {section === "leads" ? (
              <LeadsSection leads={filteredLeads} allLeads={leads} filter={leadFilter} setFilter={setLeadFilter} loading={loading} status={profile.status} busyLeadId={busyLeadId} onOpenLead={(lead) => void openLeadDetails(lead)} formatCurrency={formatCurrency} formatDate={formatDate} />
            ) : null}
            {section === "billing" ? <BillingSection billing={billing} formatCurrency={formatCurrency} formatDate={formatDate} /> : null}
            {section === "account" ? <AccountSection profile={profile} onProfileChange={setProfile} setNotice={setNotice} /> : null}
          </div>
        </main>
      </div>

      {selectedLead ? (
          <LeadDetailsModal
          lead={selectedLead}
          accountActive={profile.status === "ACTIVE"}
          busy={busyLeadId === selectedLead.id}
          active={!unlockLead}
          onClose={() => setSelectedLead(null)}
          onUnlock={() => setUnlockLead(selectedLead)}
          onStatus={(status) => void updateLeadStatus(selectedLead, status)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      ) : null}
      {unlockLead ? (
        <UnlockConfirmation lead={unlockLead} busy={busyLeadId === unlockLead.id} onCancel={() => setUnlockLead(null)} onConfirm={() => void confirmUnlock()} formatCurrency={formatCurrency} />
      ) : null}
    </div>
  );
}

function PageHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{copy}</p>
      </div>
      {action}
    </div>
  );
}

function OverviewSection({ profile, metrics, leads, billing, loading, onShowLeads, onOpenLead, formatCurrency, formatDate, formatNumber }: {
  profile: CleanerProfile;
  metrics: { received: number; opened: number; won: number; spend: number; conversion: number; costPerWon: number };
  leads: CleaningLead[];
  billing: BillingSummary;
  loading: boolean;
  onShowLeads: () => void;
  onOpenLead: (lead: CleaningLead) => void;
  formatCurrency: (value: number) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number) => string;
}) {
  const { t } = useLanguage();
  const newest = leads.slice(0, 4);
  const cards = [
    { label: t("cleanerDashboard.leadsReceived"), value: formatNumber(metrics.received), icon: Inbox, colour: "bg-sky-100 text-sky-700" },
    { label: t("cleanerDashboard.leadsOpened"), value: formatNumber(metrics.opened), icon: LockKeyhole, colour: "bg-emerald-100 text-emerald-700" },
    { label: t("cleanerDashboard.jobsWon"), value: formatNumber(metrics.won), icon: ClipboardCheck, colour: "bg-violet-100 text-violet-700" },
    { label: t("cleanerDashboard.openedSpend"), value: formatCurrency(metrics.spend), icon: CircleDollarSign, colour: "bg-orange-100 text-orange-700" },
  ];
  return (
    <>
      <PageHeading eyebrow={t("cleanerDashboard.workspaceEyebrow")} title={t("cleanerDashboard.greeting", { name: profile.contactPerson.split(" ")[0] || t("cleanerDashboard.greetingFallback") })} copy={t("cleanerDashboard.workspaceCopy")} />
      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("cleanerDashboard.performanceSummary")}>
        {cards.map(({ label, value, icon: Icon, colour }) => (
          <div key={label} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_35px_-30px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colour}`}><Icon className="h-5 w-5" /></span><TrendingUp className="h-4 w-4 text-slate-300" /></div>
            <p className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950">{loading ? "—" : value}</p><p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </section>
      <CleanerLeadTrendsCard leads={leads} loading={loading} />
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black tracking-[-0.03em]">{t("cleanerDashboard.latestLeads")}</h2><p className="mt-1 text-sm text-slate-500">{t("cleanerDashboard.latestLeadsCopy")}</p></div><button type="button" onClick={onShowLeads} className="hidden items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-900 sm:inline-flex">{t("cleanerDashboard.viewAll")} <ChevronRight className="h-4 w-4" /></button></div>
          <div className="mt-5 divide-y divide-slate-100">
            {!loading && newest.length === 0 ? <EmptyLeads /> : newest.map((lead) => (
              <button key={lead.id} type="button" onClick={() => onOpenLead(lead)} className="flex w-full items-center gap-3 py-4 text-left transition first:pt-0 last:pb-0 hover:bg-slate-50 sm:rounded-xl sm:px-2">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${lead.unlocked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{lead.unlocked ? <Eye className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{lead.cleaning.generalLocation || "Local cleaning request"}</span><span className="mt-1 block truncate text-xs text-slate-500">{lead.cleaning.bedrooms} · {lead.cleaning.propertyType} · {formatDate(lead.createdAt, { day: "numeric", month: "short" })}</span></span>
                <LeadStatus status={lead.status} /><ChevronRight className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[26px] bg-[linear-gradient(145deg,#0c2330,#173f73)] p-6 text-white shadow-[0_24px_55px_-35px_rgba(15,35,64,0.9)]">
            <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sky-200"><ReceiptText className="h-5 w-5" /></span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sky-100">This month</span></div>
            <p className="mt-6 text-sm text-sky-100">Current invoice</p><p className="mt-1 text-4xl font-black tracking-[-0.04em]">{formatCurrency(billing.currentInvoice?.total ?? 0)}</p><p className="mt-2 text-sm text-slate-300">{billing.currentInvoice?.leadCount ?? 0} opened lead{billing.currentInvoice?.leadCount === 1 ? "" : "s"} at {formatCurrency(billing.pricePerLead ?? CLEANING_LEAD_PRICING.fixedPrice)} each</p>
            {billing.nextInvoiceAt ? <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-300">Month closes {formatDate(billing.nextInvoiceAt, { dateStyle: "long" })}.</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Conversion</p><p className="mt-2 text-2xl font-black">{metrics.conversion}%</p><p className="mt-1 text-xs text-slate-500">Won ÷ opened</p></div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Cost / win</p><p className="mt-2 text-2xl font-black">{metrics.won ? formatCurrency(metrics.costPerWon) : "—"}</p><p className="mt-1 text-xs text-slate-500">Opened spend ÷ won</p></div>
          </div>
        </div>
      </section>
    </>
  );
}

function EmptyLeads() {
  const { t } = useLanguage();
  return <div className="py-12 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Inbox className="h-6 w-6" /></span><p className="mt-4 font-bold text-slate-800">{t("cleanerDashboard.noLeads")}</p><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{t("cleanerDashboard.noLeadsCopy")}</p></div>;
}

function LeadsSection({ leads, allLeads, filter, setFilter, loading, status, busyLeadId, onOpenLead, formatCurrency, formatDate }: {
  leads: CleaningLead[]; allLeads: CleaningLead[]; filter: string; setFilter: (value: string) => void; loading: boolean; status: string; busyLeadId: string; onOpenLead: (lead: CleaningLead) => void; formatCurrency: (value: number) => string; formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const { t } = useLanguage();
  const filters = [
    ["ALL", t("cleanerDashboard.filterAll"), allLeads.length],
    ["AVAILABLE", t("cleanerDashboard.filterAvailable"), allLeads.filter((lead) => !lead.unlocked).length],
    ["OPENED", t("cleanerDashboard.filterOpened"), allLeads.filter((lead) => lead.unlocked).length],
    ["WON", t("cleanerDashboard.filterWon"), allLeads.filter((lead) => lead.status === "WON").length],
  ] as const;
  return (
    <>
      <PageHeading eyebrow={t("cleanerDashboard.opportunitiesEyebrow")} title={t("cleanerDashboard.leadsTitle")} copy={t("cleanerDashboard.leadsCopy", { price: formatCurrency(CLEANING_LEAD_PRICING.fixedPrice) })} action={<div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{t("cleanerDashboard.perOpenedLead", { price: formatCurrency(CLEANING_LEAD_PRICING.fixedPrice) })}</div>} />
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="group" aria-label={t("cleanerDashboard.filterLeads")}>
        {filters.map(([value, label, count]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${filter === value ? "border-brandBlue bg-brandBlue text-white" : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"}`}>{label} <span className={filter === value ? "text-sky-100" : "text-slate-400"}>{count}</span></button>)}
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-[24px] border border-slate-200 bg-white" />) : null}
        {!loading && leads.length === 0 ? <div className="rounded-[26px] border border-slate-200 bg-white md:col-span-2 xl:col-span-3"><EmptyLeads /></div> : null}
        {!loading ? leads.map((lead) => (
          <article key={lead.id} className="group flex min-h-[17rem] flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_35px_-32px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_22px_45px_-30px_rgba(47,115,255,0.25)]">
            <div className="flex items-start justify-between gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${lead.unlocked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{lead.unlocked ? <Eye className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</span><LeadStatus status={lead.status} /></div>
            <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-slate-950">{lead.cleaning.generalLocation || "Local area"}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full bg-slate-100 px-2.5 py-1.5">{lead.cleaning.bedrooms}</span><span className="rounded-full bg-slate-100 px-2.5 py-1.5">{lead.cleaning.propertyType}</span><span className="rounded-full bg-slate-100 px-2.5 py-1.5">Move-out clean</span></div>
             <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">{lead.cleaning.notes || t("cleanerDashboard.noExtraNotes")}</p>
             <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><div><p className="text-xs text-slate-400">{t("cleanerDashboard.received")}</p><p className="mt-0.5 text-sm font-bold text-slate-700">{formatDate(lead.createdAt, { day: "numeric", month: "short", year: "numeric" })}</p></div><button type="button" disabled={busyLeadId === lead.id} onClick={() => onOpenLead(lead)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-brandBlue disabled:opacity-60">{busyLeadId === lead.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{lead.unlocked ? t("cleanerDashboard.viewDetails") : status === "ACTIVE" ? t("cleanerDashboard.preview") : t("cleanerDashboard.viewPreview")}<ChevronRight className="h-4 w-4" /></button></div>
          </article>
        )) : null}
      </div>
    </>
  );
}

function BillingSection({ billing, formatCurrency, formatDate }: { billing: BillingSummary; formatCurrency: (value: number) => string; formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string }) {
  const { t } = useLanguage();
  const invoice = billing.currentInvoice;
  return (
    <>
      <PageHeading eyebrow={t("cleanerDashboard.billingEyebrow")} title={t("cleanerDashboard.billingTitle")} copy={t("cleanerDashboard.billingCopy", { price: formatCurrency(CLEANING_LEAD_PRICING.fixedPrice) })} />
      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-[26px] bg-[linear-gradient(145deg,#0c2330,#173f73)] p-6 text-white shadow-[0_26px_55px_-35px_rgba(15,35,64,0.9)] sm:p-7">
          <div className="flex items-center justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-200"><CreditCard className="h-6 w-6" /></span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-sky-100">{t("cleanerDashboard.upcoming")}</span></div>
          <p className="mt-8 text-sm font-semibold text-sky-100">Current month</p><p className="mt-1 text-5xl font-black tracking-[-0.05em]">{formatCurrency(invoice?.total ?? 0)}</p><p className="mt-3 text-sm leading-6 text-slate-300">{invoice?.leadCount ?? 0} lead{invoice?.leadCount === 1 ? "" : "s"} opened · {formatCurrency(billing.pricePerLead ?? CLEANING_LEAD_PRICING.fixedPrice)} each</p>
          <div className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-slate-300"><p>Amounts are recorded in NZD. GST is shown only when it is confirmed on an issued invoice.</p>{billing.nextInvoiceAt ? <p className="mt-2">Next month begins {formatDate(billing.nextInvoiceAt, { dateStyle: "long" })}.</p> : null}</div>
        </div>
        <div className="rounded-[26px] border border-slate-200 bg-white p-5 sm:p-6">
           <div className="flex items-center justify-between"><div><h2 className="text-xl font-black tracking-[-0.03em]">{t("cleanerDashboard.openedLeadsThisMonth")}</h2><p className="mt-1 text-sm text-slate-500">{t("cleanerDashboard.eachLeadOnce")}</p></div><Banknote className="h-5 w-5 text-slate-400" /></div>
          <div className="mt-5 divide-y divide-slate-100">
             {!invoice?.purchases?.length ? <div className="py-10 text-center text-sm text-slate-500">{t("cleanerDashboard.noOpenedLeads")}</div> : invoice.purchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><MapPin className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{purchase.generalLocation || "Cleaning lead"}</p><p className="mt-0.5 text-xs text-slate-500">Opened {formatDate(purchase.purchasedAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p></div><p className="text-sm font-black">{formatCurrency(purchase.amount)}</p></div>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 sm:p-6">
         <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><FileText className="h-5 w-5" /></span><div><h2 className="text-xl font-black tracking-[-0.03em]">{t("cleanerDashboard.invoiceHistory")}</h2><p className="text-sm text-slate-500">{t("cleanerDashboard.invoiceHistoryCopy")}</p></div></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.1em] text-slate-400"><th className="pb-3 pr-4">Period</th><th className="pb-3 pr-4">Invoice</th><th className="pb-3 pr-4">Leads</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4 text-right">Total</th><th className="pb-3 text-right">Receipt</th></tr></thead><tbody>
          {billing.invoiceHistory.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-slate-500">No completed invoices yet.</td></tr> : billing.invoiceHistory.map((item) => {
            const invoiceDocumentUrl = item.documentUrl || item.hostedInvoiceUrl || item.invoicePdfUrl;
            return (
            <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="py-4 pr-4 font-bold text-slate-800">{item.periodStart ? formatDate(item.periodStart, { month: "long", year: "numeric" }) : item.periodKey}</td><td className="py-4 pr-4 text-slate-600">{item.invoiceNumber || "Pending issue"}</td><td className="py-4 pr-4 text-slate-600">{item.leadCount}</td><td className="py-4 pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${invoiceStatusStyles[item.status] ?? "bg-slate-100 text-slate-700"}`}>{displayStatus(item.status)}</span></td><td className="py-4 pr-4 text-right font-black">{formatCurrency(item.total)}</td><td className="py-4 text-right">{invoiceDocumentUrl ? <a href={invoiceDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-sky-700 hover:text-sky-900">View <ExternalLink className="h-3.5 w-3.5" /></a> : <span className="text-slate-400">—</span>}</td></tr>
            );
          })}
        </tbody></table></div>
      </section>
    </>
  );
}

function AccountSection({ profile, onProfileChange, setNotice }: { profile: CleanerProfile; onProfileChange: (profile: CleanerProfile) => void; setNotice: (notice: Notice) => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ companyName: profile.companyName, contactPerson: profile.contactPerson, phone: profile.phone, nzbn: profile.nzbn, yearsOperating: profile.yearsOperating?.toString() ?? "", serviceAreas: profile.serviceAreas, businessDescription: profile.businessDescription });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  function toggleArea(area: string) { setForm((current) => ({ ...current, serviceAreas: current.serviceAreas.includes(area) ? current.serviceAreas.filter((item) => item !== area) : [...current.serviceAreas, area] })); }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/cleaner/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = (await response.json().catch(() => ({}))) as { error?: string; profile?: Partial<CleanerProfile> };
      if (!response.ok) { setNotice({ type: "error", message: data.error || "Your company profile could not be saved." }); return; }
      onProfileChange({ ...profile, ...data.profile, yearsOperating: data.profile?.yearsOperating ?? null, nzbn: data.profile?.nzbn ?? "", businessDescription: data.profile?.businessDescription ?? "" });
      setNotice({ type: "success", message: "Cleaner company profile saved." });
    } catch { setNotice({ type: "error", message: "Your profile could not be saved. Check your connection and try again." }); } finally { setSaving(false); }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setChangingPassword(true);
    try {
      const response = await fetch("/api/cleaner/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(passwordForm) });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) { setNotice({ type: "error", message: data.error || "Your password could not be changed." }); return; }
      setPasswordForm({ currentPassword: "", password: "", confirmPassword: "" }); setNotice({ type: "success", message: "Password changed successfully." });
    } catch { setNotice({ type: "error", message: "Your password could not be changed. Try again." }); } finally { setChangingPassword(false); }
  }
  return (
    <>
      <PageHeading eyebrow={t("cleanerDashboard.accountSettingsEyebrow")} title={t("cleanerDashboard.accountTitle")} copy={t("cleanerDashboard.accountCopy")} />
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
        <form onSubmit={saveProfile} className="rounded-[26px] border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><BriefcaseBusiness className="h-5 w-5" /></span><div><h2 className="text-xl font-black tracking-[-0.03em]">{t("cleanerDashboard.companyProfile")}</h2><p className="text-sm text-slate-500">{t("cleanerDashboard.companyProfileCopy")}</p></div></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Company name<input required value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} className={accountInputClass} /></label>
            <label className="text-sm font-semibold text-slate-700">Contact person<input required value={form.contactPerson} onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} className={accountInputClass} /></label>
            <label className="text-sm font-semibold text-slate-700">Phone<input required type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={accountInputClass} /></label>
            <label className="text-sm font-semibold text-slate-700">Account email<input disabled value={profile.email} className={accountInputClass} /><span className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">{profile.emailVerified ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> : <BellRing className="h-3.5 w-3.5 text-amber-600" />}{profile.emailVerified ? "Verified" : "Verification pending"}</span></label>
            <label className="text-sm font-semibold text-slate-700">NZBN <span className="font-normal text-slate-400">(optional)</span><input inputMode="numeric" value={form.nzbn} onChange={(event) => setForm((current) => ({ ...current, nzbn: event.target.value.replace(/\D/g, "").slice(0, 13) }))} className={accountInputClass} placeholder="13 digits" /></label>
            <label className="text-sm font-semibold text-slate-700">Years operating <span className="font-normal text-slate-400">(optional)</span><input type="number" min="0" max="200" value={form.yearsOperating} onChange={(event) => setForm((current) => ({ ...current, yearsOperating: event.target.value }))} className={accountInputClass} /></label>
          </div>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Business description <span className="font-normal text-slate-400">(optional)</span><textarea rows={4} maxLength={1000} value={form.businessDescription} onChange={(event) => setForm((current) => ({ ...current, businessDescription: event.target.value }))} className={`${accountInputClass} resize-y`} placeholder="Describe your cleaning team, services and what customers can expect." /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{form.businessDescription.length}/1000</span></label>
          <fieldset className="mt-5"><legend className="text-sm font-bold text-slate-800">Service regions</legend><p className="mt-1 text-xs leading-5 text-slate-500">Leads are matched to the property being cleaned, not its destination.</p><div className="mt-3 space-y-4 rounded-2xl bg-slate-50 p-4">{NZ_SERVICE_AREA_GROUPS.map((group) => <div key={group.id}><p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-400">{group.label}</p><div className="flex flex-wrap gap-2">{group.regions.map((area) => { const selected = form.serviceAreas.includes(area); return <label key={area} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition ${selected ? "border-brandBlue bg-brandBlue text-white" : "border-slate-300 bg-white text-slate-600 hover:border-sky-300"}`}><input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleArea(area)} />{area}</label>; })}</div></div>)}</div></fieldset>
           <button disabled={saving || form.serviceAreas.length === 0} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brandBlue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saving ? t("cleanerDashboard.saving") : t("cleanerDashboard.saveCompanyProfile")}</button>
        </form>
        <div className="space-y-5">
          <form onSubmit={changePassword} className="rounded-[26px] border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><KeyRound className="h-5 w-5" /></span><div><h2 className="text-xl font-black tracking-[-0.03em]">Password</h2><p className="text-sm text-slate-500">Update your account security.</p></div></div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Current password<input required type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} className={accountInputClass} /></label><label className="block text-sm font-semibold text-slate-700">New password<input required type="password" autoComplete="new-password" value={passwordForm.password} onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))} className={accountInputClass} /></label><label className="block text-sm font-semibold text-slate-700">Confirm new password<input required type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={accountInputClass} /></label></div><button disabled={changingPassword} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">{changingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{changingPassword ? "Updating..." : "Change password"}</button></form>
          <div className="rounded-[26px] border border-sky-200 bg-sky-50 p-5"><div className="flex gap-3"><CircleUserRound className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><h2 className="font-black text-sky-950">Need account help?</h2><p className="mt-1 text-sm leading-6 text-sky-800">Contact the Match &apos;n Move team for account ownership, billing, or approval questions.</p><Link href="/contact" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-sky-900 underline underline-offset-2">Contact support <ArrowRight className="h-3.5 w-3.5" /></Link></div></div></div>
        </div>
      </div>
    </>
  );
}

function LeadDetailsModal({ lead, accountActive, busy, active, onClose, onUnlock, onStatus, formatCurrency, formatDate }: { lead: CleaningLead; accountActive: boolean; busy: boolean; active: boolean; onClose: () => void; onUnlock: () => void; onStatus: (status: string) => void; formatCurrency: (value: number) => string; formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string }) {
  const { t } = useLanguage();
  const dialogRef = useDialogFocus<HTMLDivElement>(active);
  return (
    <div ref={dialogRef} className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="lead-details-title">
      <button type="button" aria-label="Close lead details" onClick={onClose} className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
      <div className="relative z-10 max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Cleaning lead</p><h2 id="lead-details-title" className="mt-1 truncate text-2xl font-black tracking-[-0.03em]">{lead.cleaning.generalLocation || "Local cleaning request"}</h2></div><button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-5 w-5" /></button></div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2"><LeadStatus status={lead.status} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Received {formatDate(lead.createdAt, { dateStyle: "medium" })}</span>{lead.unlocked ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" />Contact unlocked</span> : null}</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
            [MapPin, "General area", lead.cleaning.generalLocation || "Not provided"],
            [Building2, "Property", lead.cleaning.propertyType || "Not provided"],
            [Home, "Bedrooms", lead.cleaning.bedrooms || "Not provided"],
            [CalendarDays, "Timing", lead.cleaning.moveDate ? `${formatDate(lead.cleaning.moveDate, { dateStyle: "medium" })}${lead.cleaning.dateFlexible ? " (flexible)" : ""}` : "Flexible / not set"],
          ].map(([Icon, label, value]) => { const LeadIcon = Icon as typeof MapPin; return <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><LeadIcon className="h-4 w-4 text-sky-700" /><p className="mt-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-400">{String(label)}</p><p className="mt-1 text-sm font-bold text-slate-800">{String(value)}</p></div>; })}</div>
          <div className="mt-5 rounded-[22px] border border-slate-200 p-5"><h3 className="text-sm font-black text-slate-900">Cleaning notes</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{lead.cleaning.notes || "The customer did not add any extra cleaning notes."}</p></div>
          {lead.customerAccessSuspended ? (
            <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-700" /><h3 className="text-lg font-black text-amber-950">{t("cleanerDashboard.customerAccessSuspended")}</h3></div><p className="mt-2 text-sm leading-6 text-amber-900">{t("cleanerDashboard.customerAccessSuspendedCopy")}</p></div>
          ) : lead.unlocked && lead.customer ? (
            <div className="mt-5 rounded-[24px] border border-sky-200 bg-sky-50 p-5"><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-sky-700" /><h3 className="text-lg font-black text-sky-950">Customer details</h3></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/80 p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Customer</p><p className="mt-1 font-bold text-slate-900">{lead.customer.name}</p></div><div className="rounded-2xl bg-white/80 p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Full pickup address</p><p className="mt-1 font-bold leading-6 text-slate-900">{[lead.customer.address, lead.customer.city, lead.customer.region, lead.customer.postcode].filter(Boolean).join(", ")}</p></div><a href={`mailto:${lead.customer.email}`} className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 text-sm font-bold text-sky-800 transition hover:bg-white"><Mail className="h-5 w-5" /><span className="min-w-0 truncate">{lead.customer.email}</span></a><a href={`tel:${lead.customer.phone}`} className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 text-sm font-bold text-sky-800 transition hover:bg-white"><Phone className="h-5 w-5" />{lead.customer.phone}</a></div>
              <div className="mt-5 flex flex-col gap-3 border-t border-sky-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-sky-700">Job progress</p><p className="mt-1 text-sm text-sky-900">Keep the pipeline current after you contact the customer.</p></div><select aria-label="Update lead progress" disabled={busy} value={["CONTACTED", "WON", "LOST", "ARCHIVED"].includes(lead.status) ? lead.status : "PURCHASED"} onChange={(event) => event.target.value !== "PURCHASED" && onStatus(event.target.value)} className="min-h-11 rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-sky-100"><option value="PURCHASED" disabled>Opened — choose next step</option><option value="CONTACTED">Contacted</option><option value="WON">Won</option><option value="LOST">Lost</option><option value="ARCHIVED">Archived</option></select></div>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(145deg,#f8fafc,#eef4fb)]"><div className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm"><LockKeyhole className="h-5 w-5" /></span><div><h3 className="text-lg font-black text-slate-950">Customer details are locked</h3><p className="mt-1 text-sm leading-6 text-slate-600">Opening reveals the customer&apos;s name, email, phone number and full pickup address. The destination and moving inventory are never included in a cleaner lead.</p></div></div><div className="mt-5 flex flex-col gap-3 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-2xl font-black text-slate-950">{formatCurrency(lead.price)}</p><p className="text-xs text-slate-500">Added once to this month&apos;s invoice</p></div><button type="button" disabled={busy || !accountActive} onClick={onUnlock} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accentOrange px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#d46f30] disabled:cursor-not-allowed disabled:bg-slate-400">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}{accountActive ? "Open customer details" : "Available after approval"}</button></div></div></div>
          )}
        </div>
      </div>
    </div>
  );
}

function UnlockConfirmation({ lead, busy, onCancel, onConfirm, formatCurrency }: { lead: CleaningLead; busy: boolean; onCancel: () => void; onConfirm: () => void; formatCurrency: (value: number) => string }) {
  const { t } = useLanguage();
  const dialogRef = useDialogFocus<HTMLDivElement>();
  return (
    <div ref={dialogRef} className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="unlock-title"><button type="button" aria-label={t("cleanerDashboard.keepLocked")} onClick={onCancel} className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" /><div className="relative z-10 w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-7"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><LockKeyhole className="h-7 w-7" /></span><h2 id="unlock-title" className="mt-5 text-2xl font-black tracking-[-0.035em] text-slate-950">{t("cleanerDashboard.openLeadTitle")}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{t("cleanerDashboard.openLeadCopy", { location: lead.cleaning.generalLocation })}</p><div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4"><div className="flex items-center justify-between gap-4"><span className="text-sm font-bold text-orange-950">{t("cleanerDashboard.chargeAdded")}</span><span className="text-2xl font-black text-orange-950">{formatCurrency(lead.price)}</span></div><p className="mt-2 text-xs leading-5 text-orange-900">{t("cleanerDashboard.fixedChargeCopy")}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" disabled={busy} onClick={onCancel} className="min-h-12 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{t("cleanerDashboard.keepLocked")}</button><button type="button" disabled={busy} onClick={onConfirm} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accentOrange px-4 py-3 text-sm font-bold text-white hover:bg-[#d46f30] disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />}{busy ? t("cleanerDashboard.opening") : t("cleanerDashboard.confirm", { price: formatCurrency(lead.price) })}</button></div></div></div>
  );
}
