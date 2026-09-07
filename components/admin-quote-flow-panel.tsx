"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  Inbox,
  LoaderCircle,
  MailCheck,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import type { QuoteFlowDelivery, QuoteFlowItem, QuoteFlowPage } from "@/lib/quote-flow-types";
import { cx } from "@/lib/utils";

export type AdminMoverQuoteSummary = {
  id: string;
  companyName: string;
  email: string;
  accountStatus: string;
  serviceAreas: string[];
  assignmentCount: number;
  statusCounts: Record<string, number>;
  latestAssignment: {
    assignedAt: string;
    quoteRequestId: string;
    fromCity: string;
    fromRegion: string;
    toCity: string;
    toRegion: string;
  } | null;
};

export type AdminQuoteFlowSummary = {
  moverCount: number;
  quoteRequestCount: number;
  assignmentCount: number;
  unmatchedQuoteCount: number;
  trackedEmailCount: number;
  sentEmailCount: number;
  emailAttentionCount: number;
};

export type AdminUnmatchedQuote = {
  id: string;
  createdAt: string;
  fromCity: string;
  fromRegion: string;
  toCity: string;
  toRegion: string;
  moveDate: string | null;
  dateFlexible: boolean;
};

type Props = {
  movers: AdminMoverQuoteSummary[];
  summary: AdminQuoteFlowSummary;
  recentUnmatchedQuotes: AdminUnmatchedQuote[];
  initialMoverId: string | null;
  initialPage: QuoteFlowPage;
};

const leadStatusOrder = ["NEW", "NOTIFIED", "VIEWED", "PURCHASED", "CONTACTED", "WON", "LOST", "EXPIRED", "ARCHIVED"];

const leadStatusLabels: Record<string, string> = {
  NEW: "New",
  NOTIFIED: "Available",
  VIEWED: "Viewed",
  PURCHASED: "Opened",
  CONTACTED: "Contacted",
  WON: "Won",
  LOST: "Lost",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
};

const leadStatusTones: Record<string, string> = {
  NEW: "bg-sky-100 text-sky-800",
  NOTIFIED: "bg-indigo-100 text-indigo-800",
  VIEWED: "bg-amber-100 text-amber-800",
  PURCHASED: "bg-emerald-100 text-emerald-800",
  CONTACTED: "bg-violet-100 text-violet-800",
  WON: "bg-teal-100 text-teal-800",
  LOST: "bg-rose-100 text-rose-800",
  EXPIRED: "bg-rose-100 text-rose-800",
  ARCHIVED: "bg-slate-100 text-slate-700",
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-NZ", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Pacific/Auckland",
});

const dateFormatter = new Intl.DateTimeFormat("en-NZ", {
  dateStyle: "medium",
  timeZone: "Pacific/Auckland",
});

const currencyFormatter = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatMoveDate(value: string | null, flexible: boolean) {
  if (!value) return flexible ? "Flexible date" : "Date not supplied";
  const label = dateFormatter.format(new Date(value));
  return flexible ? `${label} (flexible)` : label;
}

function routePlace(city: string, region: string) {
  return city.trim() || region.trim() || "Not supplied";
}

function LeadStatusBadge({ status }: { status: string }) {
  return (
    <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", leadStatusTones[status] ?? leadStatusTones.ARCHIVED)}>
      {leadStatusLabels[status] ?? status.toLowerCase()}
    </span>
  );
}

function DeliveryAttempt({ label, delivery, emptyDetail }: { label: string; delivery?: QuoteFlowDelivery; emptyDetail: string }) {
  if (!delivery) {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">No linked record</span>
        <p className="mt-1 text-xs leading-5 text-slate-500">{emptyDetail}</p>
      </div>
    );
  }

  const presentation = {
    SENT: { label: "SMTP accepted", tone: "bg-emerald-100 text-emerald-800" },
    QUEUED: { label: "Queued", tone: "bg-amber-100 text-amber-800" },
    SENDING: { label: "Sending", tone: "bg-sky-100 text-sky-800" },
    FAILED: { label: "Failed", tone: "bg-rose-100 text-rose-800" },
  }[delivery.status] ?? { label: delivery.status, tone: "bg-slate-100 text-slate-700" };

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <span className={cx("mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold", presentation.tone)}>{presentation.label}</span>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {delivery.sentAt
          ? formatDateTime(delivery.sentAt)
          : `${delivery.attempts}/${delivery.maxAttempts} attempts`}
      </p>
      {delivery.lastError ? (
        <details className="mt-1 max-w-sm text-xs text-rose-700">
          <summary className="cursor-pointer font-semibold">Delivery error</summary>
          <p className="mt-1 break-words leading-5">{delivery.lastError}</p>
        </details>
      ) : null}
      {delivery.providerMessageId ? (
        <details className="mt-1 max-w-sm text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold">Message ID</summary>
          <p className="mt-1 break-all font-mono leading-5">{delivery.providerMessageId}</p>
        </details>
      ) : null}
    </div>
  );
}

function DeliveryStatus({ item }: { item: QuoteFlowItem }) {
  const initial = item.emailDeliveries.find((delivery) => delivery.kind === "mover_new_lead");
  const reminder = item.emailDeliveries.find((delivery) => delivery.kind === "mover_lead_expiry_warning");
  const reminderDetail = item.reminderSentAt
    ? "The reminder was triggered before per-lead reminder tracking was added."
    : "Not triggered yet.";

  return (
    <div className="space-y-3">
      <DeliveryAttempt
        label="Initial alert"
        delivery={initial}
        emptyDetail="Older assignment or no per-lead email record."
      />
      <DeliveryAttempt
        label="24-hour reminder"
        delivery={reminder}
        emptyDetail={reminderDetail}
      />
    </div>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <span className="rounded-xl bg-slate-100 p-2 text-slate-700">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

export function AdminQuoteFlowPanel({ movers, summary, recentUnmatchedQuotes, initialMoverId, initialPage }: Props) {
  const [selectedMoverId, setSelectedMoverId] = useState(initialMoverId);
  const [pages, setPages] = useState<Record<string, QuoteFlowPage>>(
    initialMoverId ? { [initialMoverId]: initialPage } : {},
  );
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<"ALL" | "ACTIVE" | "OTHER">("ALL");
  const [leadFilter, setLeadFilter] = useState("ALL");
  const [busyMoverId, setBusyMoverId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const filteredMovers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return movers.filter((mover) => {
      const matchesAccount = accountFilter === "ALL"
        || (accountFilter === "ACTIVE" && mover.accountStatus === "ACTIVE")
        || (accountFilter === "OTHER" && mover.accountStatus !== "ACTIVE");
      const matchesQuery = !normalizedQuery || [
        mover.companyName,
        mover.email,
        ...mover.serviceAreas,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesAccount && matchesQuery;
    });
  }, [accountFilter, movers, query]);

  const selectedMover = movers.find((mover) => mover.id === selectedMoverId) ?? null;
  const selectedPage = selectedMoverId ? pages[selectedMoverId] : undefined;
  const visibleItems = selectedPage?.items.filter((item) => leadFilter === "ALL" || item.status === leadFilter) ?? [];
  const availableLeadStatuses = selectedMover
    ? leadStatusOrder.filter((status) => (selectedMover.statusCounts[status] ?? 0) > 0)
    : [];

  async function loadMover(moverId: string, cursor: string | null = null, append = false) {
    const requestId = ++requestSequence.current;
    setBusyMoverId(moverId);
    setError("");

    try {
      const search = new URLSearchParams({ moverId });
      if (cursor) search.set("cursor", cursor);
      const response = await fetch(`/api/admin/quote-flow?${search.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await response.json().catch(() => null)) as (QuoteFlowPage & { error?: string }) | null;

      if (!response.ok || !data) throw new Error(data?.error || "Could not load this mover's quote flow.");
      if (requestId !== requestSequence.current) return;

      setPages((current) => ({
        ...current,
        [moverId]: append && current[moverId]
          ? {
              items: [...current[moverId].items, ...data.items],
              nextCursor: data.nextCursor,
            }
          : data,
      }));
    } catch (loadError) {
      if (requestId === requestSequence.current) {
        setError(loadError instanceof Error ? loadError.message : "Could not load this mover's quote flow.");
      }
    } finally {
      if (requestId === requestSequence.current) setBusyMoverId(null);
    }
  }

  function selectMover(moverId: string) {
    if (pages[moverId]) {
      requestSequence.current += 1;
      setBusyMoverId(null);
    }
    setSelectedMoverId(moverId);
    setLeadFilter("ALL");
    setError("");
    if (!pages[moverId]) void loadMover(moverId);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Building2 className="h-5 w-5" />}
          label="Movers"
          value={summary.moverCount.toLocaleString("en-NZ")}
          detail="Every registered mover account"
        />
        <MetricCard
          icon={<Inbox className="h-5 w-5" />}
          label="Quote requests"
          value={summary.quoteRequestCount.toLocaleString("en-NZ")}
          detail={summary.unmatchedQuoteCount ? `${summary.unmatchedQuoteCount} have no mover assignment` : "Every quote has a mover assignment"}
        />
        <MetricCard
          icon={<Send className="h-5 w-5" />}
          label="Mover assignments"
          value={summary.assignmentCount.toLocaleString("en-NZ")}
          detail="One quote may be assigned to several movers"
        />
        <MetricCard
          icon={<MailCheck className="h-5 w-5" />}
          label="Tracked notifications"
          value={`${summary.sentEmailCount.toLocaleString("en-NZ")} accepted`}
          detail={`${summary.trackedEmailCount.toLocaleString("en-NZ")} tracked · ${summary.emailAttentionCount.toLocaleString("en-NZ")} queued or failed`}
        />
      </section>

      {summary.unmatchedQuoteCount > 0 ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-amber-100 p-2 text-amber-800"><AlertTriangle className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-black tracking-[-0.02em] text-amber-950">{summary.unmatchedQuoteCount} quote {summary.unmatchedQuoteCount === 1 ? "request has" : "requests have"} no mover assignment</h2>
              <p className="mt-1 text-sm leading-6 text-amber-900">These requests did not produce any lead records. Check mover coverage and verification for the listed routes.</p>
              {recentUnmatchedQuotes.length ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {recentUnmatchedQuotes.map((quote) => (
                    <div key={quote.id} className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="break-all font-mono text-xs font-bold text-slate-700">{quote.id}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(quote.createdAt)}</p>
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                        {routePlace(quote.fromCity, quote.fromRegion)}
                        <ArrowRight className="h-3.5 w-3.5 text-amber-700" />
                        {routePlace(quote.toCity, quote.toRegion)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Move: {formatMoveDate(quote.moveDate, quote.dateFlexible)}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> Every quote request has at least one mover assignment.
        </section>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:sticky lg:top-4">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">Mover directory</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">Who received what</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{filteredMovers.length}</span>
            </div>

            <label className="relative mt-4 block">
              <span className="sr-only">Search movers</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search mover or region"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter mover accounts">
              {(["ALL", "ACTIVE", "OTHER"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAccountFilter(filter)}
                  className={cx(
                    "rounded-full px-3 py-1.5 text-xs font-bold transition",
                    accountFilter === filter ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {filter === "ALL" ? "All" : filter === "ACTIVE" ? "Active" : "Other status"}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[680px] overflow-y-auto p-2">
            {filteredMovers.length ? filteredMovers.map((mover) => {
              const active = mover.id === selectedMoverId;
              const latest = mover.latestAssignment;

              return (
                <button
                  key={mover.id}
                  type="button"
                  onClick={() => selectMover(mover.id)}
                  className={cx(
                    "mb-1 w-full rounded-2xl border px-3 py-3 text-left transition last:mb-0",
                    active ? "border-teal-300 bg-teal-50 shadow-sm" : "border-transparent hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{mover.companyName}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{mover.email}</p>
                    </div>
                    <span className={cx("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", mover.accountStatus === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700")}>{mover.accountStatus}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700">{mover.assignmentCount} {mover.assignmentCount === 1 ? "quote" : "quotes"}</span>
                    <span className="text-slate-500">{latest ? formatDateTime(latest.assignedAt) : "None yet"}</span>
                  </div>
                  {latest ? (
                    <p className="mt-2 truncate text-xs text-slate-500">
                      Latest: {routePlace(latest.fromCity, latest.fromRegion)} → {routePlace(latest.toCity, latest.toRegion)}
                    </p>
                  ) : null}
                </button>
              );
            }) : (
              <p className="px-3 py-8 text-center text-sm text-slate-500">No movers match this search.</p>
            )}
          </div>
        </aside>

        <div className="min-w-0 rounded-[28px] border border-slate-200 bg-white shadow-sm">
          {selectedMover ? (
            <>
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">Mover quote flow</p>
                    <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-slate-950">{selectedMover.companyName}</h2>
                    <p className="mt-1 break-all text-sm text-slate-500">{selectedMover.email}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {selectedMover.serviceAreas.length ? selectedMover.serviceAreas.join(" · ") : "No service areas configured"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadMover(selectedMover.id)}
                    disabled={busyMoverId === selectedMover.id}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {busyMoverId === selectedMover.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter quote statuses">
                  <button
                    type="button"
                    onClick={() => setLeadFilter("ALL")}
                    className={cx("rounded-full px-3 py-1.5 text-xs font-bold", leadFilter === "ALL" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600")}
                  >
                    All {selectedMover.assignmentCount}
                  </button>
                  {availableLeadStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setLeadFilter(status)}
                      className={cx(
                        "rounded-full px-3 py-1.5 text-xs font-bold",
                        leadFilter === status ? "bg-slate-950 text-white" : leadStatusTones[status] ?? leadStatusTones.ARCHIVED,
                      )}
                    >
                      {leadStatusLabels[status] ?? status} {selectedMover.statusCounts[status]}
                    </button>
                  ))}
                </div>
              </div>

              {error ? <p className="m-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:m-5">{error}</p> : null}

              {!selectedPage && busyMoverId === selectedMover.id ? (
                <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                  <LoaderCircle className="h-5 w-5 animate-spin" /> Loading quote assignments...
                </div>
              ) : visibleItems.length ? (
                <div className="divide-y divide-slate-100">
                  {visibleItems.map((item) => (
                    <article key={item.id} className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.7fr)_minmax(150px,0.55fr)] xl:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-all font-mono text-xs font-bold text-slate-500">{item.quoteRequestId}</p>
                            {item.redistributionRound > 0 ? <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-800">Redistributed · round {item.redistributionRound}</span> : null}
                          </div>
                          <h3 className="mt-2 flex flex-wrap items-center gap-2 text-base font-black text-slate-950">
                            {routePlace(item.quote.fromCity, item.quote.fromRegion)}
                            <ArrowRight className="h-4 w-4 shrink-0 text-teal-600" />
                            {routePlace(item.quote.toCity, item.quote.toRegion)}
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>{item.quote.bedrooms} {item.quote.bedrooms === "1" ? "bedroom" : "bedrooms"}</span>
                            {item.quote.movingWhat ? <span>{item.quote.movingWhat}</span> : null}
                            <span>Move: {formatMoveDate(item.quote.moveDate, item.quote.dateFlexible)}</span>
                            <span>Platform lead fee: {currencyFormatter.format(item.price / 100)}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Assigned to dashboard</p>
                          <p className="mt-1 text-sm font-bold text-slate-800">{formatDateTime(item.assignedAt)}</p>
                          <div className="mt-2"><LeadStatusBadge status={item.status} /></div>
                          {item.viewedAt ? (
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700"><Eye className="h-3.5 w-3.5" /> Viewed {formatDateTime(item.viewedAt)}</p>
                          ) : ["NEW", "NOTIFIED", "VIEWED", "EXPIRED"].includes(item.status) ? (
                            <p className="mt-1 text-xs text-slate-500">No authenticated dashboard view recorded</p>
                          ) : null}
                          {item.purchasedAt ? <p className="mt-1 text-xs font-semibold text-emerald-700">Opened {formatDateTime(item.purchasedAt)}</p> : null}
                          {item.expiresAt && ["NEW", "NOTIFIED", "VIEWED"].includes(item.status) ? (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Expires {formatDateTime(item.expiresAt)}</p>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Notification attempts</p>
                          <div className="mt-1"><DeliveryStatus item={item} /></div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                  <span className="rounded-2xl bg-slate-100 p-3 text-slate-500"><Inbox className="h-6 w-6" /></span>
                  <p className="mt-3 font-bold text-slate-800">{leadFilter === "ALL" ? "No quotes assigned to this mover yet." : "No loaded quotes have this status."}</p>
                  {leadFilter !== "ALL" && selectedPage?.nextCursor ? <p className="mt-1 text-xs text-slate-500">Load older assignments or choose another status.</p> : null}
                </div>
              )}

              {selectedPage?.nextCursor ? (
                <div className="border-t border-slate-200 p-4 text-center">
                  <button
                    type="button"
                    onClick={() => void loadMover(selectedMover.id, selectedPage.nextCursor, true)}
                    disabled={busyMoverId === selectedMover.id}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {busyMoverId === selectedMover.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Load older assignments
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <span className="rounded-2xl bg-slate-100 p-3 text-slate-500"><Building2 className="h-6 w-6" /></span>
              <h2 className="mt-3 text-xl font-black text-slate-900">No mover selected</h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Choose a mover to inspect its quote assignments and notification delivery.</p>
            </div>
          )}
        </div>
      </section>

      <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">
        Privacy safeguard: this view excludes customer names, contact details, and full street addresses. “SMTP accepted” means the configured provider accepted the message; it does not prove Inbox placement. “Viewed” is recorded only after the authenticated mover displays that lead in the dashboard.
      </p>
    </div>
  );
}
