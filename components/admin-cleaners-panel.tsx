"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, CircleDollarSign, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";

type CleanerStatus = "PENDING" | "ACTIVE" | "INACTIVE";

type Invoice = {
  id: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  leadCount: number;
  subtotal: number;
  gstAmount: number | null;
  total: number;
  currency: string;
  status: string;
  invoiceNumber: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
};

type Cleaner = {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  emailVerified: boolean;
  serviceAreas: string[];
  status: CleanerStatus;
  createdAt: string;
  totalLeads: number;
  totalUnlocked: number;
  currentInvoice: Invoice | null;
  outstandingBalance: number;
  outstandingInvoiceCount: number;
  invoices: Invoice[];
};

type ApiPayload = {
  currentPeriod: { key: string; start: string; end: string };
  cleaners: Cleaner[];
};

const statusTone: Record<CleanerStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-slate-200 text-slate-700",
};

function money(cents: number, currency = "NZD") {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency }).format(cents / 100);
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function AdminCleanersPanel() {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, CleanerStatus>>({});

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/cleaners", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as ApiPayload | { error?: string } | null;
      if (!response.ok || !data || !("cleaners" in data)) throw new Error(data && "error" in data ? data.error : "Could not load cleaners.");
      setPayload(data);
      setDraftStatuses(Object.fromEntries(data.cleaners.map((cleaner) => [cleaner.id, cleaner.status])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load cleaners.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => {
    const cleaners = payload?.cleaners ?? [];
    return {
      active: cleaners.filter((cleaner) => cleaner.status === "ACTIVE").length,
      pending: cleaners.filter((cleaner) => cleaner.status === "PENDING").length,
      currentLeads: cleaners.reduce((sum, cleaner) => sum + (cleaner.currentInvoice?.leadCount ?? 0), 0),
      currentBalance: cleaners.reduce((sum, cleaner) => sum + (cleaner.currentInvoice?.total ?? 0), 0),
      outstanding: cleaners.reduce((sum, cleaner) => sum + cleaner.outstandingBalance, 0),
    };
  }, [payload]);

  async function saveStatus(cleaner: Cleaner) {
    const status = draftStatuses[cleaner.id] ?? cleaner.status;
    if (status === cleaner.status) return;
    setBusyId(cleaner.id);
    setError("");
    try {
      const response = await fetch("/api/admin/cleaners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleanerId: cleaner.id, status }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not update cleaner status.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update cleaner status.");
    } finally {
      setBusyId(null);
    }
  }

  if (!payload && !error) {
    return <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">Loading cleaner accounts…</div>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 font-bold shadow-sm"><RefreshCw className="h-4 w-4" /> Retry</button>
        </div>
      ) : null}

      <section aria-label="Cleaner account summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Active cleaners", value: summary.active, icon: ShieldCheck },
          { label: "Awaiting activation", value: summary.pending, icon: UsersRound },
          { label: "Opened this month", value: summary.currentLeads, icon: UsersRound },
          { label: "Current-month balance", value: money(summary.currentBalance), icon: CircleDollarSign },
          { label: "Outstanding issued", value: money(summary.outstanding), icon: CircleDollarSign },
        ].map((item) => (
          <div key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <item.icon aria-hidden="true" className="h-5 w-5 text-sky-700" />
            <p className="mt-4 text-2xl font-black tracking-tight text-slate-950">{item.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4" aria-label="Cleaning companies">
        {(payload?.cleaners ?? []).length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black text-slate-950">No cleaner accounts yet</h2>
            <p className="mt-2 text-sm text-slate-600">New cleaner registrations will appear here for activation.</p>
          </div>
        ) : payload?.cleaners.map((cleaner) => (
          <article key={cleaner.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,1fr)] lg:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-slate-950">{cleaner.companyName}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[cleaner.status]}`}>{cleaner.status}</span>
                  {!cleaner.emailVerified ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">Email unverified</span> : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">{cleaner.contactPerson} · {cleaner.email}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Coverage</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cleaner.serviceAreas.map((area) => <span key={area} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">{area}</span>)}
                </div>
                <p className="mt-3 text-xs text-slate-500">Joined {date(cleaner.createdAt)} · {cleaner.totalLeads} assigned · {cleaner.totalUnlocked} opened</p>
              </div>

              <div className="rounded-[22px] bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{payload?.currentPeriod.key} billing</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div><p className="text-2xl font-black text-slate-950">{cleaner.currentInvoice?.leadCount ?? 0}</p><p className="text-xs text-slate-500">Opened leads</p></div>
                  <div><p className="text-2xl font-black text-slate-950">{money(cleaner.currentInvoice?.total ?? 0)}</p><p className="text-xs text-slate-500">Running balance</p></div>
                </div>
                <p className="mt-3 text-xs text-slate-500">{cleaner.outstandingInvoiceCount} issued invoice(s) outstanding · {money(cleaner.outstandingBalance)}</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500" htmlFor={`cleaner-status-${cleaner.id}`}>Account status</label>
                <div className="mt-2 flex gap-2">
                  <select id={`cleaner-status-${cleaner.id}`} value={draftStatuses[cleaner.id] ?? cleaner.status} onChange={(event) => setDraftStatuses((current) => ({ ...current, [cleaner.id]: event.target.value as CleanerStatus }))} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100">
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE" disabled={!cleaner.emailVerified}>Active{!cleaner.emailVerified ? " (verify email first)" : ""}</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <button type="button" disabled={busyId === cleaner.id || (draftStatuses[cleaner.id] ?? cleaner.status) === cleaner.status} onClick={() => void saveStatus(cleaner)} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45">{busyId === cleaner.id ? "Saving…" : "Save"}</button>
                </div>
              </div>
            </div>

            <details className="border-t border-slate-200 bg-slate-50/70 px-5 py-4 lg:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-800">
                Invoice history ({cleaner.invoices.length})
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </summary>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                {cleaner.invoices.length ? (
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-4 py-3">Period</th><th className="px-4 py-3">Leads</th><th className="px-4 py-3">Subtotal</th><th className="px-4 py-3">GST</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Issued</th><th className="px-4 py-3">Document</th></tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      {cleaner.invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-4 py-3 font-semibold text-slate-900">{invoice.periodKey}</td><td className="px-4 py-3">{invoice.leadCount}</td><td className="px-4 py-3">{money(invoice.subtotal, invoice.currency)}</td><td className="px-4 py-3">{invoice.gstAmount === null ? "Not itemised" : money(invoice.gstAmount, invoice.currency)}</td><td className="px-4 py-3 font-bold">{money(invoice.total, invoice.currency)}</td><td className="px-4 py-3">{invoice.status}</td><td className="px-4 py-3">{date(invoice.issuedAt)}</td><td className="px-4 py-3">{invoice.hostedInvoiceUrl || invoice.invoicePdfUrl ? <a className="font-bold text-sky-700 hover:underline" href={invoice.hostedInvoiceUrl || invoice.invoicePdfUrl || "#"} target="_blank" rel="noreferrer">View invoice</a> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="p-5 text-sm text-slate-500">No invoice records yet.</p>}
              </div>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}
