"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, Eye, Mail, MessageCircle, Pause, Play, Plus, RefreshCw, Search, Send } from "lucide-react";
import { emailStationStatusLabels, emailStationSteps, stationNextLabel, stationTemplateLabel, type EmailStationStatus } from "@/lib/email-station-policy";
import type { EmailStationDetail, EmailStationList } from "@/lib/email-station";

const control = "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:opacity-50";
const button = "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function useEmailStationData<T>(query: string, refresh = 0) {
  const [result, setResult] = useState<{ key: string; revision: number; data: T | null; error: string; loading: boolean }>({ key: query, revision: refresh, data: null, error: "", loading: true });
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/recruitment?${query}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load email outreach.");
      if (!controller.signal.aborted) setResult({ key: query, revision: refresh, data, error: "", loading: false });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key: query, revision: refresh, data: null, error: error instanceof Error ? error.message : "Could not load email outreach.", loading: false });
    });
    return () => controller.abort();
  }, [query, refresh]);
  return result.key === query && result.revision === refresh ? result : { data: result.key === query ? result.data : null, error: "", loading: true };
}

function date(value?: string | null, withTime = true) {
  return value ? new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", ...(withTime ? { timeStyle: "short" as const } : {}) }).format(new Date(value)) : "Not scheduled";
}

function Status({ status }: { status: EmailStationStatus }) {
  const colour = status === "REGISTERED" ? "bg-emerald-50 text-emerald-800" : status === "RESPONSE_RECEIVED" ? "bg-blue-50 text-blue-800" : ["REVISIT_DUE", "NEEDS_REVIEW"].includes(status) ? "bg-amber-50 text-amber-900" : ["IN_PROGRESS", "SENDING"].includes(status) ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${colour}`}>{emailStationStatusLabels[status]}</span>;
}

function nextDate(company: EmailStationList["items"][number]) {
  if (company.status === "REVISIT_DUE") return "Next: Manual review";
  if (company.status === "IN_PROGRESS") {
    if (company.nextDueAt) return `Next: ${date(company.nextDueAt, false)}`;
    if (company.revisitAt) return `Review: ${date(company.revisitAt, false)}`;
  }
  return `Next: ${stationNextLabel(company.status)}`;
}

export function EmailOutreachStation({ actor, composer, onCompose, initialCompanyId = "" }: {
  actor: { role: "OWNER" | "RECRUITMENT_ADMIN"; canViewLeads: boolean };
  composer?: ReactNode; onCompose: () => void; initialCompanyId?: string;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(initialCompanyId);
  const [refresh, setRefresh] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const timer = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(timer); }, [q]);
  useEffect(() => { const timer = setInterval(() => { if (document.visibilityState === "visible") setRefresh(value => value + 1); }, 60000); return () => clearInterval(timer); }, []);
  const query = new URLSearchParams({ view: "email_outreach", q: debounced, page: String(page), ...(status ? { status } : {}), ...(businessType ? { businessType } : {}) }).toString();
  const list = useEmailStationData<EmailStationList>(query, refresh);
  const data = q.trim() === debounced ? list.data : null;
  const selectedId = selected || data?.items[0]?.id || "";
  function filter(value: string) { setStatus(value); setPage(1); setSelected(""); }
  const metrics = list.data?.metrics;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm leading-6 text-slate-600">Track each company&apos;s invitations, follow-ups and responses. Select a company to see its timeline and next action.</p><div className="flex gap-2"><button type="button" className={secondary} aria-label="Refresh email outreach" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} /></button><button type="button" className={button} onClick={onCompose}><Plus size={16} />{composer ? "Close invitation form" : "New invitation"}</button></div></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[{ title: "Companies", count: metrics?.companies, filter: "", icon: Building2 }, { title: "In progress", count: metrics?.inProgress, filter: "IN_PROGRESS", icon: Send }, { title: "Responses", count: metrics?.responses, filter: "RESPONSE_RECEIVED", icon: MessageCircle }, { title: "Revisit due", count: metrics?.revisitDue, filter: "REVISIT_DUE", icon: CalendarClock }].map(metric => <button key={metric.title} type="button" aria-pressed={status === metric.filter} onClick={() => filter(metric.filter)} className={`rounded-2xl border bg-white p-4 text-left transition hover:border-teal-500 ${status === metric.filter ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-200"}`}><span className="flex items-center justify-between gap-2 text-xs text-slate-500">{metric.title}<metric.icon size={17} /></span><strong className="mt-3 block text-2xl font-bold text-slate-950">{metric.count ?? "—"}</strong></button>)}
    </div>
    {composer}
    <div className="flex flex-col gap-3 sm:flex-row"><label className="relative min-w-0 flex-1"><span className="sr-only">Search company or contact</span><Search size={16} className="absolute left-3 top-3.5 text-slate-400" /><input className={`${control} w-full pl-10`} placeholder="Search company or contact…" value={q} onChange={event => { setQ(event.target.value); setPage(1); setSelected(""); }} /></label><select aria-label="Filter outreach status" className={control} value={status} onChange={event => filter(event.target.value)}><option value="">All statuses</option>{Object.entries(emailStationStatusLabels).filter(([value]) => value !== "SENDING").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Filter outreach business" className={control} value={businessType} onChange={event => { setBusinessType(event.target.value); setPage(1); setSelected(""); }}><option value="">Moving &amp; cleaning</option><option value="MOVING">Moving companies</option><option value="CLEANING">Cleaning companies</option></select></div>
    {list.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{list.error}</p>}
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
      <section aria-label="Company outreach records" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold text-slate-950">Company records</h2><span className="text-xs text-slate-500">{data ? `${data.count} results` : "Loading…"}</span></div>
        <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1 lg:max-h-[720px]">
          {data?.items.map(company => <button type="button" key={company.id} aria-pressed={selectedId === company.id} onClick={() => { setSelected(company.id); if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1023px)").matches) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={`w-full rounded-xl border p-3 text-left transition ${selectedId === company.id ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600" : "border-slate-200 bg-slate-50/60 hover:border-teal-300 hover:bg-teal-50/40"}`}>
            <span className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-white p-2 text-slate-500"><Building2 size={17} /></span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold text-slate-900">{company.companyName}</span><span className="mt-1 block truncate text-xs text-slate-500">{company.contactName || company.email || "Contact not recorded"}</span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-teal-700">{company.businessType === "CLEANING" ? "Cleaning" : "Moving"}</span></span><ChevronRight size={16} className="mt-2 shrink-0 text-slate-400" /></span>
            <span className="mt-3 flex flex-wrap items-center justify-between gap-2"><Status status={company.status} /><span className="text-[11px] text-slate-500">{nextDate(company)}</span></span>
          </button>)}
          {!data && !list.error && <p role="status" className="p-5 text-sm text-slate-500">Loading company progress…</p>}
          {data && !data.items.length && <p className="rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">No companies match these filters. Try another search or add a company to the directory.</p>}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"><button type="button" aria-label="Previous company page" disabled={page === 1 || list.loading} onClick={() => { setPage(page - 1); setSelected(""); }} className="inline-flex items-center gap-1 disabled:opacity-30"><ChevronLeft size={15} />Previous</button><span>Page {page}</span><button type="button" aria-label="Next company page" disabled={!data || page * data.pageSize >= data.count || list.loading} onClick={() => { setPage(page + 1); setSelected(""); }} className="inline-flex items-center gap-1 disabled:opacity-30">Next<ChevronRight size={15} /></button></div>
      </section>
      <div ref={detailRef} className="min-w-0 scroll-mt-5">{selectedId ? <CompanyOutreachDetails key={selectedId} id={selectedId} refresh={refresh} onChanged={() => setRefresh(value => value + 1)} actor={actor} /> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Select a company to view its outreach progress.</div>}</div>
    </div>
  </div>;
}

function CompanyOutreachDetails({ id, refresh, onChanged, actor }: { id: string; refresh: number; onChanged: () => void; actor: { role: "OWNER" | "RECRUITMENT_ADMIN"; canViewLeads: boolean } }) {
  const router = useRouter();
  const { data, error, loading } = useEmailStationData<EmailStationDetail>(`view=email_outreach_company&id=${encodeURIComponent(id)}`, refresh);
  const [tab, setTab] = useState("timeline");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [template, setTemplate] = useState<string | null>(null);
  async function mutate(action: string, input: unknown) {
    const response = await fetch("/api/admin/recruitment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, data: input }) });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new Error(result.error || "This action could not be completed.");
    return result;
  }
  async function act(action: string, input: unknown, openPreview = false) {
    setBusy(true); setActionError("");
    try { const result = await mutate(action, input); if (openPreview && result.id) router.push(`/admin/recruitment/messages?id=${encodeURIComponent(result.id)}`); onChanged(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "This action could not be completed."); }
    finally { setBusy(false); }
  }
  if (!data) return <section className="rounded-2xl border border-slate-200 bg-white p-6"><p role={error ? "alert" : "status"} className={error ? "text-sm text-red-800" : "text-sm text-slate-500"}>{error || "Loading company outreach details…"}</p></section>;
  const { company, campaign, messages } = data;
  const currentMessages = campaign ? messages.filter(message => message.campaignId === campaign.id) : messages.filter(message => !message.campaignId);
  const drafts = currentMessages.filter(message => ["DRAFT", "RETRY"].includes(message.status));
  const sent = currentMessages.filter(message => message.status === "SENT" && message.sentAt).sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime());
  const preview = drafts.find(message => message.canPreview) || sent.find(message => message.canPreview);
  const initial = currentMessages.find(message => message.sequence === 0);
  const firstSentAt = campaign?.initialSentAt || sent.find(message => message.sequence === 0)?.sentAt;
  const inProgress = company.status === "IN_PROGRESS";
  const due = Boolean(inProgress && campaign?.nextDueAt && new Date(campaign.nextDueAt) <= new Date());
  const nextMessage = currentMessages.find(message => message.sequence === campaign?.nextSequence);
  const canPrepareDue = due && (!nextMessage || nextMessage.status === "DISCARDED") && sent[0] && campaign!.nextSequence < 4;
  const active = ["IN_PROGRESS", "DRAFT", "REVISIT_DUE"].includes(company.status);
  const canStart = !company.respondedAt && !company.registeredAt && !["DO_NOT_CONTACT", "NOT_INTERESTED", "REGISTRATION_STARTED", "REGISTERED", "ACTIVE_MOVER"].includes(company.companyStatus) && !["REGISTERED", "REGISTERING", "RESPONSE_RECEIVED", "NEEDS_REVIEW", "SENDING"].includes(company.status) && (!campaign || ["CLOSED", "STOPPED"].includes(campaign.status));
  const reviewedStart = company.hasLegacy || Boolean(campaign);
  return <section aria-label="Company outreach details" className="min-w-0 rounded-2xl border border-slate-200 bg-white">
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-950">Company outreach details</h2><Status status={company.status} /></div>
      <div className="mt-5 flex items-start gap-3"><span className="rounded-xl bg-slate-100 p-3 text-slate-600"><Building2 size={22} /></span><div className="min-w-0"><Link href={`/admin/recruitment/prospects?id=${company.id}`} className="break-words font-bold text-slate-950 hover:text-teal-700">{company.companyName}</Link><p className="mt-1 break-words text-xs leading-5 text-slate-500">{company.contactName || "Contact person not recorded"} · {company.email || "Email not recorded"}</p><p className="mt-1 text-xs text-teal-700">{company.businessType === "CLEANING" ? "Cleaning company" : "Moving company"}</p></div></div>
      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-sm"><div><dt className="text-xs text-slate-500">Initial invitation</dt><dd className="mt-1 font-semibold">{initial ? stationTemplateLabel(initial.templateKey, 0) : "Not prepared"}</dd></div><div><dt className="text-xs text-slate-500">Initial email sent</dt><dd className="mt-1 font-semibold">{firstSentAt ? date(firstSentAt) : "Not sent"}</dd></div><div><dt className="text-xs text-slate-500">Next follow-up</dt><dd className={`mt-1 font-semibold ${due ? "text-amber-800" : ""}`}>{inProgress && campaign?.nextDueAt ? `${date(campaign.nextDueAt)}${due ? " · Due now" : ""}` : stationNextLabel(company.status)}</dd></div><div><dt className="text-xs text-slate-500">Three-month review</dt><dd className="mt-1 font-semibold">{["IN_PROGRESS", "REVISIT_DUE"].includes(company.status) && campaign?.revisitAt ? date(campaign.revisitAt) : ["RESPONSE_RECEIVED", "REGISTERED", "REGISTERING", "STOPPED"].includes(company.status) ? "Stopped" : campaign?.revisitAt ? `${date(campaign.revisitAt)} · Paused` : "Not scheduled"}</dd></div></dl>
      {company.status === "RESPONSE_RECEIVED" && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">Response received {date(company.respondedAt)}. Automatic follow-ups have stopped. Review the conversation in the <Link href="/admin/inbox" className="font-semibold underline">Inbox</Link>.</p>}
      {company.hasLegacy && !campaign && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Previous emails or drafts are saved for this company. Review Send history before starting a new sequence.</p>}
      {campaign?.reason && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{campaign.reason}</p>}
      {inProgress && (!data.automation.enabled || data.automation.blocked) && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{!data.automation.enabled ? "Automatic follow-ups are off. Due emails need administrator review and approval." : data.automation.blocked}</p>}
      <div role="tablist" aria-label="Company outreach views" className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">{[["timeline", "Timeline"], ["history", "Send history"], ["templates", "Templates"]].map(([value, title]) => <button key={value} type="button" role="tab" aria-selected={tab === value} aria-controls={`outreach-${id}-${value}`} id={`outreach-tab-${id}-${value}`} onClick={() => { setTab(value); setTemplate(null); }} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${tab === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-teal-700"}`}>{title}</button>)}</div>
      <div role="tabpanel" id={`outreach-${id}-${tab}`} aria-labelledby={`outreach-tab-${id}-${tab}`} className="mt-5">
        {tab === "timeline" && <><p className="mb-5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Outreach sequence</p><ol aria-label="Company email timeline">{emailStationSteps.map((step, sequence) => {
          const stageMessages = currentMessages.filter(item => item.sequence === sequence);
          const message = stageMessages.filter(item => item.status === "SENT" && item.sentAt).sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime())[0] || stageMessages[0];
          const complete = Boolean(message?.status === "SENT" && message.sentAt);
          const pending = !complete && Boolean(message && ["DRAFT", "RETRY", "SENDING", "NEEDS_REVIEW"].includes(message.status));
          const upcoming = !complete && (sequence === campaign?.nextSequence && ["IN_PROGRESS", "REVISIT_DUE"].includes(company.status));
          const Icon = complete ? CheckCircle2 : pending || upcoming ? Clock3 : Circle;
          const plannedAt = sequence === 4 ? campaign?.revisitAt : sequence === campaign?.nextSequence ? campaign?.nextDueAt : null;
          return <li key={step.title} className="relative flex gap-3 pb-6 last:pb-0">{sequence < 4 && <span aria-hidden className="absolute bottom-1 left-[9px] top-6 w-px bg-slate-200" />}<Icon size={20} className={`relative mt-0.5 shrink-0 bg-white ${complete ? "text-emerald-600" : pending || upcoming ? "text-blue-600" : "text-slate-300"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h3 className="text-sm font-semibold text-slate-900">{step.title}</h3><span className="text-[10px] text-slate-400">{step.timing}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{complete ? `Sent ${date(message!.sentAt)}` : message?.status === "NEEDS_REVIEW" ? "Delivery uncertain · administrator review required" : message?.status === "SENDING" ? "Sending in progress" : message?.status === "RETRY" ? `Retry pending${message.retryAt ? ` · ${date(message.retryAt)}` : ""}` : message?.status === "DRAFT" ? "Draft ready · review before sending" : message?.status === "DISCARDED" ? "Draft removed" : upcoming && plannedAt ? `${sequence === 4 ? "Review due" : "Due"} ${date(plannedAt)}` : !active && campaign ? "Not sent · outreach paused or stopped" : step.description}</p></div></li>;
        })}</ol></>}
        {tab === "history" && <div className="space-y-3">{!messages.length && <p className="py-6 text-sm text-slate-500">No emails have been prepared or sent for this company.</p>}{messages.map(message => <article key={message.id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{stationTemplateLabel(message.templateKey, message.sequence)}</p><p className="mt-1 break-words text-xs text-slate-500">{message.subject}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${message.status === "SENT" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{message.status === "DISCARDED" ? "Draft removed" : message.status.replaceAll("_", " ").toLowerCase()}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{message.status === "SENT" && message.sentAt ? `Sent ${date(message.sentAt)}` : `Saved ${date(message.createdAt)} · Not confirmed sent`}</span>{message.canPreview && message.status !== "DISCARDED" && <Link className="inline-flex items-center gap-1 font-semibold text-teal-700 underline" href={`/admin/recruitment/messages?id=${message.id}`}><Eye size={13} />Preview email</Link>}</div>{message.lastError && <p className="mt-2 text-xs leading-5 text-amber-800">{message.lastError}</p>}</article>)}{messages.length > 0 && <p className="text-[11px] leading-5 text-slate-400">Sent confirms acceptance by the email provider. Inbox delivery is not confirmed.{data.messageCount > messages.length ? ` Showing the latest ${messages.length} of ${data.messageCount} records.` : ""}</p>}</div>}
        {tab === "templates" && (template ? <TemplatePreview id={id} templateKey={template} onBack={() => setTemplate(null)} /> : <div className="space-y-3"><p className="text-xs leading-5 text-slate-500">{company.businessType === "CLEANING" ? "Cleaning" : "Moving"} templates for this company. Previewing a template sends no email.</p>{data.templates.map(item => <article key={item.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-semibold text-slate-800">{item.name}</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{item.subject}</p></div>{item.key === "MOVER_OPPORTUNITY" ? <Link href={`/admin/recruitment/leads?prospectId=${id}`} aria-disabled={!actor.canViewLeads} className={`text-xs font-semibold text-teal-700 underline ${!actor.canViewLeads ? "pointer-events-none opacity-50" : ""}`}>{actor.canViewLeads ? "Choose a lead to preview" : "Lead access required"}</Link> : <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 underline" onClick={() => setTemplate(item.key)}><Eye size={13} />Preview template</button>}</article>)}</div>)}
      </div>
      {actionError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
      {preview && <Link className={button} href={`/admin/recruitment/messages?id=${preview.id}`}><Eye size={16} />Preview email</Link>}
      {canPrepareDue && <button type="button" className={secondary} disabled={busy || loading} onClick={() => void act("prepare_followup", { id: sent[0].id }, true)}><Mail size={16} />Prepare due follow-up</button>}
      {company.status === "REVISIT_DUE" && campaign && <button type="button" className={button} disabled={busy || loading} onClick={() => void act("campaign", { campaignId: campaign.id, updatedAt: campaign.updatedAt, operation: "reengage" }, true)}><Eye size={16} />Preview re-engagement</button>}
      {active && campaign && <button type="button" className={secondary} disabled={busy || loading} onClick={() => void act("campaign", { campaignId: campaign.id, updatedAt: campaign.updatedAt, operation: "pause" })}><Pause size={15} />Pause outreach</button>}
      {company.status === "PAUSED" && campaign && <button type="button" className={secondary} disabled={busy || loading} onClick={() => void act("campaign", { campaignId: campaign.id, updatedAt: campaign.updatedAt, operation: "resume" })}><Play size={15} />Resume outreach</button>}
      {canStart && <button type="button" className={preview ? secondary : button} disabled={busy || loading || !company.email} onClick={() => {
        if (reviewedStart && !window.confirm("Start a new reviewed sequence? Check the previous contact history and permission first. This creates a draft and sends no email.")) return;
        void act(reviewedStart ? "start_mover_campaign" : "prepare_general", reviewedStart ? { prospectId: id, confirmed: true } : { prospectId: id }, true);
      }}><Plus size={15} />{reviewedStart ? "Start a reviewed sequence" : "Prepare invitation"}</button>}
      <Link href={`/admin/recruitment/prospects?id=${id}`} className="ml-auto text-xs font-semibold text-teal-700 underline">Company record</Link>
    </div>
  </section>;
}

function TemplatePreview({ id, templateKey, onBack }: { id: string; templateKey: string; onBack: () => void }) {
  const { data, error, loading } = useEmailStationData<{ subject: string; html: string }>(new URLSearchParams({ view: "email_template_preview", prospectId: id, templateKey }).toString());
  return <section aria-label="Email template preview"><button type="button" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700" onClick={onBack}><ChevronLeft size={14} />All templates</button><p className="mb-3 rounded-lg bg-teal-50 p-3 text-xs text-teal-800">Template preview only. No draft or email has been sent.</p>{error && <p role="alert" className="text-sm text-red-800">{error}</p>}{loading && <p role="status" className="text-sm text-slate-500">Loading template…</p>}{data && <><h3 className="mb-3 text-sm font-semibold">{data.subject}</h3><iframe title="Email template preview" sandbox="" srcDoc={data.html} className="h-[650px] w-full rounded-xl border border-slate-200" /></>}</section>;
}
