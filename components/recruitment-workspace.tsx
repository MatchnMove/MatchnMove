"use client";
import { PartnerInboxSummary } from "@/components/partner-inbox-summary";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  CircleHelp,
  Plus,
} from "lucide-react";
import {
  MoverDiscovery,
  type DiscoveredProspectForm,
} from "@/components/mover-discovery";
import { recruitmentDateRange } from "@/lib/recruitment-dates";
import { NZ_SERVICE_AREAS } from "@/lib/nz-regions";
import { contactFollowUp, prospectContactSchema, validBusinessEmail } from "@/lib/prospect-contacts";
import { statuses as pipeline, manualStatuses as manual } from "@/lib/recruitment-stages";
import { CompanyStageSelect } from "@/components/company-stage-select";
type Actor = {
  id: string;
  role: "OWNER" | "RECRUITMENT_ADMIN";
  canSend: boolean;
  canViewLeads: boolean;
  name: string;
};
type Task = {
  id: string;
  title: string;
  description: string | null;
  assignedAdminId: string;
  prospectId: string | null;
  dueAt: string;
  priority: string;
  completedAt: string | null;
  cancelledAt: string | null;
  prospect?: { companyName: string };
};
type Activity = {
  id: string;
  action: string;
  createdAt: string;
  prospect?: { companyName: string };
};
type Prospect = {
  id: string;
  companyName: string;
  email: string | null;
  emailAvailability: string | null;
  phoneAvailability: string | null;
  contactName: string | null;
  phone: string | null;
  website: string | null;
  operatingRegion: string | null;
  serviceAreas: string[];
  serviceTypes: string[];
  longDistance: boolean;
  assignedAdminId: string;
  assignedAdmin?: { id: string; name: string | null };
  status: string;
  consentBasis: string;
  consentEvidence: string | null;
  notes: string | null;
  duplicateReviewNote: string | null;
  version: number;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  registeredAt: string | null;
  activatedAt: string | null;
  firstPaidLeadAt: string | null;
  activities?: Activity[];
  messages?: Message[];
  tasks?: Task[];
};
type Message = {
  id: string;
  prospectId: string;
  quoteRequestId: string | null;
  status: string;
  subject: string;
  introduction: string;
  text: string;
  html: string;
  updatedAt: string;
  sentAt: string | null;
  lastError: string | null;
  prospect?: { companyName: string; email: string | null };
};
type Lead = {
  id: string;
  origin: string;
  destination: string;
  moveDate: string;
  property: string;
  bedrooms: string;
  createdAt: string;
  dateFlexible: boolean;
};
type Metrics = Record<
  | "assigned"
  | "uncontacted"
  | "contacted"
  | "invitationsSent"
  | "responses"
  | "interested"
  | "registered"
  | "activated"
  | "firstPaid"
  | "followUpsDue"
  | "tasksCompleted"
  | "invitationConversion"
  | "activationConversion"
  | "leadInvitationConversion"
  | "cohortInvitations"
  | "cohortRegistered"
  | "cohortActivated",
  number
>;
type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  adminRole: string | null;
  adminDisabledAt: string | null;
  lastSignInAt: string | null;
  canSendRecruitment: boolean;
  canViewRecruitmentLeads: boolean;
  _count: { assignedProspects: number; recruitmentTasks: number };
};
type Invitation = {
  id: string;
  name: string;
  email: string;
  role: string;
  sentAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
};
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-NZ", {
        dateStyle: "medium",
        timeZone: "Pacific/Auckland",
      }).format(new Date(value))
    : "—";
const emptyProspect = {
  companyName: "",
  email: "",
  emailAvailability: "",
  phoneAvailability: "",
  contactName: "",
  phone: "",
  website: "",
  operatingRegion: "",
  serviceAreas: [] as string[],
  serviceTypes: [] as string[],
  longDistance: false,
  consentBasis: "UNKNOWN",
  consentEvidence: "",
  notes: "",
  duplicateReviewNote: "",
};
type ProspectForm = typeof emptyProspect;

async function api<T>(query: string): Promise<T> {
  const response = await fetch(`/api/admin/recruitment?${query}`, {
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Could not load workspace.");
  return body;
}
async function mutate<T = unknown>(action: string, data: unknown): Promise<T> {
  const response = await fetch("/api/admin/recruitment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const body = await response.json();
  if (!response.ok || body.ok === false)
    throw new Error(body.error || "This action could not be completed.");
  return body;
}
function useData<T>(query: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const body = await api<T>(query);
      setData(body);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    let current = true;
    api<T>(query)
      .then((body) => {
        if (current) {
          setData(body);
          setError("");
        }
      })
      .catch((error) => {
        if (current) setError(error.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [query]);
  return { data, error, loading, load };
}
function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
      <span>{title}</span>
      {children}
    </label>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <CircleHelp className="mx-auto mb-3 text-teal-600" size={26} />
      <p className="font-bold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        {detail}
      </p>
    </div>
  );
}
function State({ error, loading }: { error: string; loading: boolean }) {
  return error ? (
    <p
      role="alert"
      className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      {error}
    </p>
  ) : loading ? (
    <p role="status" className="my-4 animate-pulse text-sm text-slate-500">
      Loading your workspace…
    </p>
  ) : null;
}
function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${["INTERESTED", "REGISTERED", "ACTIVE_MOVER", "SENT"].includes(value) ? "bg-teal-50 text-teal-800" : ["DO_NOT_CONTACT", "NEEDS_REVIEW", "NOT_INTERESTED"].includes(value) ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}
    >
      {label(value)}
    </span>
  );
}
function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-slate-950">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RecruitmentWorkspace({
  actor,
  section,
}: {
  actor: Actor;
  section: string;
}) {
  const titles: Record<string, string> = {
    dashboard: actor.role === "OWNER" ? "Onboarding overview" : "My onboarding overview",
    prospects: "Company directory", leads: "Lead opportunities", messages: "Email station",
    tasks: "Follow-ups", performance: "Recruitment reports", team: "Team & access", settings: "Email templates & settings",
  };
  return (
    <div className="min-w-0">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Mover onboarding</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{titles[section] || "Workspace"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            {section === "messages" ? "Introduce your business to movers, with or without a customer lead. Prepare, preview and send each email here."
              : section === "prospects" ? "One place for company details, contact history and the next onboarding step."
              : section === "dashboard" ? "Your companies, priorities and recent activity in one place."
              : "Keep your companies, conversations and next steps connected."}
          </p>
        </div>
        {section === "dashboard" && <Link href="/admin/recruitment/messages?compose=1" className={buttonClass}>Write an invitation<ArrowRight size={16} /></Link>}
      </header>
      {section === "dashboard" || section === "performance" ? (
        <Dashboard actor={actor} performance={section === "performance"} />
      ) : section === "prospects" ? <Prospects actor={actor} />
        : section === "leads" ? <LeadOpportunities actor={actor} />
        : section === "messages" ? <Messages actor={actor} />
        : section === "tasks" ? <Tasks actor={actor} />
        : section === "team" && actor.role === "OWNER" ? <Team actor={actor} />
        : section === "settings" && actor.role === "OWNER" ? <OutreachSettings />
        : <Empty title="This section is unavailable" detail="Choose an authorised section from the admin navigation." />}
    </div>
  );
}

function Dashboard({
  actor,
  performance,
}: {
  actor: Actor;
  performance: boolean;
}) {
  const [range, setRange] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [query, setQuery] = useState("view=dashboard");
  const { data, error, loading, load } = useData<{
    metrics: Metrics;
    tasks: Task[];
    recent: Activity[];
    activeAdmins: number;
    recentLeads: (Lead & { invitationAllowed: boolean })[];
    performance: {
      id: string;
      name: string;
      disabled: boolean;
      metrics: Metrics;
    }[];
  }>(query);
  const [actionError, setActionError] = useState("");
  const cards: [keyof Metrics, string][] = [
    ["assigned", "Assigned companies"],
    ["uncontacted", "Not contacted"],
    ["invitationsSent", "Invitations sent"],
    ["responses", "Responses received"],
    ["interested", "Interested companies"],
    ["registered", "Registered movers"],
    ["activated", "Activated movers"],
    ["followUpsDue", "Follow-ups due"],
  ];
  return (
    <div className="space-y-6">
      {!performance && <PartnerInboxSummary />}
      <div className="flex flex-wrap items-end gap-3">
        <Field title="Reporting period">
          <select
            className={inputClass}
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="all">All time</option>
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
        </Field>
        {range === "custom" && (
          <>
            <Field title="From (Pacific/Auckland)">
              <input
                className={inputClass}
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field title="Through">
              <input
                className={inputClass}
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
          </>
        )}
        <button
          className={secondaryClass}
          onClick={() => {
            try {
              setQuery(
                new URLSearchParams({
                  view: "dashboard",
                  ...recruitmentDateRange(range, start, end),
                }).toString(),
              );
              setActionError("");
            } catch (error) {
              setActionError((error as Error).message);
            }
          }}
        >
          Apply dates
        </button>
        {actor.role === "OWNER" && (
          <button
            className={secondaryClass}
            onClick={async () => {
              try {
                await mutate("sync", {});
                await load();
              } catch (error) {
                setActionError((error as Error).message);
              }
            }}
          >
            Refresh mover outcomes
          </button>
        )}
      </div>
      <State error={error || actionError} loading={loading} />
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {cards.map(([key, title], i) => (
              <div
                key={key}
                className={`rounded-2xl border p-5 shadow-sm ${i === 5 ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white"}`}
              >
                <p
                  className={`text-xs font-semibold ${i === 5 ? "text-teal-100" : "text-slate-500"}`}
                >
                  {title}
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight">
                  {data.metrics[key]}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [
                `${data.metrics.invitationConversion}%`,
                "Invitation → registration",
              ],
              [
                `${data.metrics.activationConversion}%`,
                "Registration → activation",
              ],
              [String(data.metrics.firstPaid), "First paid lead purchases"],
            ].map(([value, title]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4"
              >
                <p className="text-2xl font-black text-teal-800">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{title}</p>
              </div>
            ))}
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Assignments and due tasks show current totals. Activity counts use
            event dates. Conversion follows invitations sent in the selected
            period through their eventual registrations and activations;{" "}
            {data.metrics.cohortRegistered} registrations /{" "}
            {data.metrics.cohortInvitations} sent invitations. Dates are
            inclusive.{" "}
            {actor.role === "OWNER"
              ? `${data.activeAdmins} active recruitment admins. Lead-to-invitation conversion: ${data.metrics.leadInvitationConversion}%.`
              : ""}
          </p>
          {(actor.role === "OWNER" || performance) && (
            <Panel
              title={actor.role === "OWNER" ? "Team results" : "Your results"}
            >
              {actor.role === "OWNER" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-xs text-slate-500">
                      <tr>
                        {[
                          "Team member",
                          "Assigned",
                          "Sent",
                          "Interested",
                          "Registered",
                          "Activated",
                          "First paid",
                        ].map((title) => (
                          <th
                            key={title}
                            className="whitespace-nowrap px-3 py-3"
                          >
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.performance.map((person) => (
                        <tr
                          key={person.id}
                          className="border-b border-slate-100"
                        >
                          <td className="px-3 py-4 font-bold">
                            {person.name}
                            {person.disabled ? " (disabled)" : ""}
                          </td>
                          {[
                            "assigned",
                            "invitationsSent",
                            "interested",
                            "registered",
                            "activated",
                            "firstPaid",
                          ].map((key) => (
                            <td key={key} className="px-3 py-4">
                              {person.metrics[key as keyof Metrics]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  {data.metrics.contacted} companies contacted ·{" "}
                  {data.metrics.tasksCompleted} follow-ups completed ·{" "}
                  {data.metrics.responses} responses
                </p>
              )}
            </Panel>
          )}
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              title="Your next steps"
              action={
                <Link
                  href="/admin/recruitment/tasks"
                  className="text-xs font-bold text-teal-700"
                >
                  View tasks →
                </Link>
              }
            >
              {data.tasks.length ? (
                <TaskList
                  items={data.tasks}
                  onComplete={async (id) => {
                    await mutate("complete_task", { id });
                    await load();
                  }}
                />
              ) : (
                <Empty
                  title="Your queue is clear"
                  detail="Add a company or prepare an invitation. Follow-up tasks appear after approved emails are sent."
                />
              )}
            </Panel>
            <Panel title="Recent recruitment activity">
              {data.recent.length ? (
                <ul className="space-y-4">
                  {data.recent.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-3 border-b border-slate-100 pb-3"
                    >
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                      <div>
                        <p className="text-sm font-semibold">
                          {label(item.action)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.prospect?.companyName} · {date(item.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty
                  title="A fresh start"
                  detail="Recruitment activity will appear here as the team starts work."
                />
              )}
            </Panel>
          </div>
          {actor.canViewLeads && <RecentLeadList items={data.recentLeads} />}
        </>
      )}
    </div>
  );
}

function RecentLeadList({
  items,
}: {
  items: (Lead & { invitationAllowed: boolean })[];
}) {
  return (
    <Panel title="Recently received moving requests">
      {items.length ? (
        <ul className="divide-y divide-slate-100">
          {items.map((lead) => (
            <li
              key={lead.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-sm font-semibold">
                  {lead.origin} → {lead.destination}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {lead.moveDate} · {lead.bedrooms} bedrooms
                </p>
              </div>
              {lead.invitationAllowed ? (
                <Link
                  className="text-xs font-bold text-teal-700"
                  href={`/admin/recruitment/leads?lead=${lead.id}`}
                >
                  Create Mover Invitation →
                </Link>
              ) : (
                <span className="text-xs text-slate-400">
                  Recruitment sharing not authorised
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          New moving requests will appear here.
        </p>
      )}
    </Panel>
  );
}

function Prospects({ actor }: { actor: Actor }) {
  const search = useSearchParams();
  const selected = search.get("id");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("recent");
  const [contact, setContact] = useState(search.get("contact") || "");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(search.get("new") === "1");
  const [discoveryDraft, setDiscoveryDraft] =
    useState<DiscoveredProspectForm | null>(null);
  const { data, error, loading, load } = useData<{
    items: Prospect[];
    count: number;
  }>(
    new URLSearchParams({
      view: "prospects",
      q,
      ...(status ? { status } : {}),
      sort,
      ...(contact ? { contact } : {}),
      page: String(page),
    }).toString(),
  );
  if (selected) return <ProspectDetails actor={actor} id={selected} />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1">
          <label className="sr-only" htmlFor="company-search">
            Search companies
          </label>
          <input
            id="company-search"
            className={inputClass}
            placeholder="Search company or email…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          aria-label="Filter recruitment status"
          className={`${inputClass} sm:w-48`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All stages</option>
          {pipeline.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
        <select aria-label="Filter contact follow-up" className={`${inputClass} sm:w-64`} value={contact} onChange={e => { setContact(e.target.value); setPage(1); }}>
          <option value="">All contact information</option>
          <option value="followup">Contact follow-up required</option>
          <option value="email">Missing business email</option>
          <option value="phone">Missing phone number</option>
          <option value="review">Availability not yet reviewed</option>
        </select>
        <select
          aria-label="Sort companies"
          className={`${inputClass} sm:w-40`}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="recent">Recently updated</option>
          <option value="name">Company A–Z</option>
        </select>
        <button
          className={buttonClass}
          onClick={() => {
            setDiscoveryDraft(null);
            setCreating(!creating);
          }}
        >
          <Plus size={16} />
          Add company
        </button>
        <MoverDiscovery
          onChoose={(form) => {
            setDiscoveryDraft(form);
            setCreating(true);
            window.requestAnimationFrame(() =>
              document
                .querySelector<HTMLInputElement>("#new-outreach-company input")
                ?.focus(),
            );
          }}
        />
      </div>
      {creating && (
        <div id="new-outreach-company">
          <Panel
            title={
              discoveryDraft
                ? "Review discovered moving company"
                : "New moving company"
            }
          >
            {discoveryDraft && (
              <p className="mb-5 rounded-xl bg-teal-50 p-4 text-sm leading-6 text-teal-950">
                Public business details have been copied below. Confirm the moving
                services, email and coverage before saving. No contact
                permission has been inferred.
              </p>
            )}
            <ProspectEditor
              key={discoveryDraft?.notes ?? "manual"}
              initialValues={discoveryDraft ?? undefined}
              onSave={async (prospect) => {
                const result = await mutate<Prospect>("save_prospect", {
                  prospect: {
                    ...prospect,
                    operatingRegion: prospect.operatingRegion || null,
                  },
                });
                setCreating(false);
                setDiscoveryDraft(null);
                await load();
                router.push(`/admin/recruitment/prospects?id=${result.id}`);
              }}
            />
          </Panel>
        </div>
      )}
      <State error={error} loading={loading} />
      {data && (
        <Panel
          title={`${data.count} ${actor.role === "OWNER" ? "prospective companies" : "assigned companies"}`}
        >
          <div className="mb-5 flex flex-wrap gap-2">
            {pipeline.slice(0, 7).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s === status ? "" : s);
                  setPage(1);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${s === status ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-500"}`}
              >
                {label(s)}
              </button>
            ))}
          </div>
          {data.items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs text-slate-500">
                  <tr>
                    {[
                      "Company",
                      "Stage",
                      "Coverage",
                      "Assigned to",
                      "Next follow-up",
                    ].map((s) => (
                      <th key={s} className="whitespace-nowrap px-3 py-3">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-4">
                        <Link
                          className="font-bold text-slate-950 hover:text-teal-700"
                          href={`/admin/recruitment/prospects?id=${p.id}`}
                        >
                          {p.companyName}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">{p.email || "No business email recorded"}</p>
                        <ContactInformationStatus prospect={p} compact />
                      </td>
                      <td className="px-3 py-4">
                        <CompanyStageSelect id={p.id} companyName={p.companyName} status={p.status} version={p.version} onSaved={load} />
                      </td>
                      <td className="px-3 py-4 text-slate-500">
                        {p.serviceAreas.join(", ") ||
                          p.operatingRegion ||
                          "Requires review"}
                      </td>
                      <td className="px-3 py-4 text-slate-500">
                        {p.assignedAdmin?.name || "Assigned"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-slate-500">
                        {date(p.nextFollowUpAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No companies here yet"
              detail="Add your first moving company, record how it can be contacted and choose its service coverage."
            />
          )}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} · 50 per page</span>
            <div className="flex gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="disabled:opacity-30"
              >
                Previous
              </button>
              <button
                disabled={page * 50 >= data.count}
                onClick={() => setPage(page + 1)}
                className="disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

export function ProspectEditor({
  prospect,
  initialValues,
  onSave,
}: {
  prospect?: Prospect;
  initialValues?: Partial<ProspectForm>;
  onSave: (form: ProspectForm) => Promise<void>;
}) {
  const [form, setForm] = useState<ProspectForm>(
    prospect
      ? {
          ...emptyProspect,
          ...Object.fromEntries(
            Object.entries(prospect).filter(([key]) => key in emptyProspect),
          ),
          contactName: prospect.contactName || "",
          email: prospect.email || "",
          emailAvailability: prospect.emailAvailability || "",
          phoneAvailability: prospect.phoneAvailability || "",
          phone: prospect.phone || "",
          website: prospect.website || "",
          operatingRegion: prospect.operatingRegion || "",
          consentEvidence: prospect.consentEvidence || "",
          notes: prospect.notes || "",
          duplicateReviewNote: prospect.duplicateReviewNote || "",
        }
      : { ...emptyProspect, ...initialValues },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (
    key: keyof ProspectForm,
    value: string | boolean | string[],
  ) => setForm((prior) => ({ ...prior, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!prospect && (!form.emailAvailability || !form.phoneAvailability)) {
      setError("Select an availability status for both Business email and Phone number before saving.");
      return;
    }
    const contactCheck = prospectContactSchema.safeParse({ ...form,
      emailAvailability: form.emailAvailability || null,
      phoneAvailability: form.phoneAvailability || null,
    });
    if (!contactCheck.success) { setError(contactCheck.error.issues[0].message); return; }
    setBusy(true);
    setError("");
    try {
      await onSave(form);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["companyName", "Company name", "text"],
          ["email", "Business email", "email"],
          ["contactName", "Contact person", "text"],
          ["phone", "Phone number", "tel"],
          ["website", "Website", "url"],
        ].map(([key, title, type]) => (
          <div key={key}>
          <Field title={title}>
            <input
              name={key}
              className={inputClass}
              type={type}
              required={key === "companyName" || (key === "email" && form.emailAvailability === "PUBLIC") || (key === "phone" && form.phoneAvailability === "PUBLIC")}
              value={String(form[key as keyof ProspectForm])}
              onChange={(e) =>
                update(key as keyof ProspectForm, e.target.value)
              }
            />
          </Field>
          {(key === "email" || key === "phone") && <fieldset className="mt-2 space-y-1.5">
            <legend className="text-xs font-semibold text-slate-600">{title} availability{!prospect ? " (required)" : ""}</legend>
            {[["PUBLIC", "Publicly Accessible"], ["NOT_PUBLIC", "Not Publicly Accessible"]].map(([value, text]) => <label key={value} className="flex items-center gap-2 text-xs text-slate-600">
              <input type="radio" required={!prospect} name={`${key}Availability`} value={value} checked={form[`${key}Availability`] === value} onChange={() => update(`${key}Availability`, value)} />{text}
            </label>)}
            {!form[`${key}Availability`] && prospect && <p className="text-xs text-slate-500">Not yet reviewed. Existing details are preserved; select after checking availability.</p>}
          </fieldset>}
          </div>
        ))}
        <Field title="Operating region">
          <select
            className={inputClass}
            value={form.operatingRegion}
            onChange={(e) => update("operatingRegion", e.target.value)}
          >
            <option value="">Unknown — review required</option>
            {NZ_SERVICE_AREAS.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-slate-700">
          Service areas
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NZ_SERVICE_AREAS.map((area) => (
            <label
              className="flex items-center gap-2 text-xs text-slate-600"
              key={area}
            >
              <input
                type="checkbox"
                checked={form.serviceAreas.includes(area)}
                onChange={(e) =>
                  update(
                    "serviceAreas",
                    e.target.checked
                      ? [...form.serviceAreas, area]
                      : form.serviceAreas.filter((a) => a !== area),
                  )
                }
              />
              {area}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-slate-700">
          Services
        </legend>
        <div className="flex flex-wrap gap-4">
          {["HOUSEHOLD", "OFFICE", "PACKING", "STORAGE", "SPECIALTY"].map(
            (service) => (
              <label key={service} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.serviceTypes.includes(service)}
                  onChange={(e) =>
                    update(
                      "serviceTypes",
                      e.target.checked
                        ? [...form.serviceTypes, service]
                        : form.serviceTypes.filter((s) => s !== service),
                    )
                  }
                />
                {label(service)}
              </label>
            ),
          )}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.longDistance}
          onChange={(e) => update("longDistance", e.target.checked)}
        />
        Offers long-distance moves
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field title="Reviewed contact permission">
          <select
            className={inputClass}
            value={form.consentBasis}
            onChange={(e) => update("consentBasis", e.target.value)}
          >
            <option value="UNKNOWN">Unknown — sending blocked</option>
            <option value="EXPRESS">Express consent</option>
            <option value="INFERRED">Inferred consent — reviewed</option>
            <option value="DEEMED_REVIEWED">Deemed consent — reviewed</option>
          </select>
        </Field>
        <Field title="Permission evidence / source">
          <textarea
            className={inputClass}
            rows={3}
            maxLength={1000}
            value={form.consentEvidence}
            onChange={(e) => update("consentEvidence", e.target.value)}
          />
        </Field>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        A published email address alone is not permission. Record the relevant
        relationship or consent evidence, relevance to the business role, source
        and any no-marketing notice review.
      </p>
      <Field title="Company notes (visible to the assigned admin and owner)">
        <textarea
          rows={4}
          className={inputClass}
          maxLength={10000}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </Field>
      <Field title="Duplicate-review explanation (owner only, when needed)">
        <input
          className={inputClass}
          value={form.duplicateReviewNote}
          onChange={(e) => update("duplicateReviewNote", e.target.value)}
        />
      </Field>
      <State error={error} loading={false} />
      <button className={buttonClass} disabled={busy}>
        {busy ? "Saving…" : "Save company"}
      </button>
    </form>
  );
}

function ContactInformationStatus({ prospect, compact = false }: { prospect: Pick<Prospect, "email" | "phone" | "emailAvailability" | "phoneAvailability">; compact?: boolean }) {
  const followUp = contactFollowUp(prospect);
  const availabilityLabel = (value: string | null) => value === "PUBLIC" ? "Publicly Accessible" : value === "NOT_PUBLIC" ? "Not Publicly Accessible" : "Not yet reviewed";
  return <div className={`${compact ? "mt-2 text-xs" : "mt-4 rounded-xl border p-4 text-sm"} ${followUp.required ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 text-slate-600"}`}>
    <p className="font-semibold">{followUp.required ? "Contact Information Incomplete — Follow-Up Required" : "Contact information recorded"}</p>
    {followUp.required && <p className="mt-1 leading-5">{followUp.description}</p>}
    {!compact && <p className="mt-2 text-xs">Email availability: {availabilityLabel(prospect.emailAvailability)} · Phone availability: {availabilityLabel(prospect.phoneAvailability)}</p>}
    {followUp.reviewRequired && <p className="mt-1 text-xs">Availability not yet fully reviewed. Review the contact source when updating this company.</p>}
    {!compact && <p className="mt-2 text-xs">Save the missing details in Edit company. Contact follow-up completes automatically when both valid details are recorded. Adding an email does not send a message or grant contact permission.</p>}
  </div>;
}

function ProspectDetails({ actor, id }: { actor: Actor; id: string }) {
  const {
    data: prospect,
    error,
    loading,
    load,
  } = useData<Prospect>(`view=prospect&id=${encodeURIComponent(id)}`);
  const { data: team } = useData<{ users: TeamUser[] }>(
    actor.role === "OWNER" ? "view=team" : "view=tasks",
  );
  const [edit, setEdit] = useState(false);
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  async function action(name: string, data: unknown) {
    setBusy(true);
    setActionError("");
    try {
      await mutate(name, data);
      await load();
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <Link
        className="inline-flex items-center gap-1 text-sm font-bold text-teal-700"
        href="/admin/recruitment/prospects"
      >
        <ChevronLeft size={16} />
        All companies
      </Link>
      <State error={error || actionError} loading={loading} />
      {prospect && (
        <>
          <Panel
            title={prospect.companyName}
            action={
              <div className="flex flex-wrap gap-2">{validBusinessEmail(prospect.email) ? <Link className={buttonClass} href={`/admin/recruitment/messages?compose=1&company=${encodeURIComponent(prospect.id)}&q=${encodeURIComponent(prospect.email)}`}>Write email</Link> : <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">Email outreach blocked — address missing</span>}<button className={secondaryClass} onClick={() => setEdit(!edit)}>
                {edit ? "Close editor" : "Edit company"}
              </button></div>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge value={prospect.status} />
              <span className="text-sm text-slate-500">
                {prospect.email || "No business email recorded"} ·{" "}
                {prospect.contactName || "Contact not recorded"}
              </span>
            </div>
            <ContactInformationStatus prospect={prospect} />
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">Coverage</p>
                <p className="mt-1">
                  {prospect.serviceAreas.join(", ") || "Requires review"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  Last contacted / next follow-up
                </p>
                <p className="mt-1">
                  {date(prospect.lastContactedAt)} /{" "}
                  {date(prospect.nextFollowUpAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  Registration / activation
                </p>
                <p className="mt-1">
                  {date(prospect.registeredAt)} / {date(prospect.activatedAt)}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-3">
              <Field title="Update recruitment status">
                <select
                  className={inputClass}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Choose a status</option>
                  {manual.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                className={secondaryClass}
                disabled={!status || busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Change ${prospect.companyName} to ${label(status)}?`,
                    )
                  )
                    void action("status", {
                      id,
                      version: prospect.version,
                      status,
                    });
                }}
              >
                Update status
              </button>
              {actor.role === "OWNER" && (
                <>
                  <Field title="Assigned team member">
                    <select
                      className={inputClass}
                      value={assignee || prospect.assignedAdminId}
                      onChange={(e) => setAssignee(e.target.value)}
                    >
                      {team?.users
                        ?.filter((u) => !u.adminDisabledAt)
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <button
                    className={secondaryClass}
                    disabled={!assignee || busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Reassign this company and its pending tasks?",
                        )
                      )
                        void action("reassign", {
                          id,
                          version: prospect.version,
                          assignedAdminId: assignee,
                        });
                    }}
                  >
                    Reassign
                  </button>
                </>
              )}
            </div>
            {actor.canViewLeads && validBusinessEmail(prospect.email) && (
              <Link
                className={`${buttonClass} mt-5`}
                href={`/admin/recruitment/leads?prospectId=${id}`}
              >
                Create Mover Invitation
                <ArrowRight size={16} />
              </Link>
            )}
          </Panel>
          {edit && (
            <Panel title="Edit contact and coverage">
              <ProspectEditor
                key={prospect.version}
                prospect={prospect}
                onSave={async (form) => {
                  await mutate("save_prospect", {
                    id,
                    version: prospect.version,
                    prospect: {
                      ...form,
                      operatingRegion: form.operatingRegion || null,
                    },
                  });
                  setEdit(false);
                  await load();
                }}
              />
            </Panel>
          )}
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Contact permission & notes">
              <Badge value={prospect.consentBasis} />
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {prospect.consentEvidence ||
                  "Permission not yet recorded. Sending is blocked."}
              </p>
              <hr className="my-4" />
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {prospect.notes || "No company notes yet."}
              </p>
            </Panel>
            <Panel title="Email history">
              {prospect.messages?.length ? (
                <ul className="space-y-3">
                  {prospect.messages.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
                    >
                      <Link
                        className="text-sm font-semibold text-teal-700"
                        href={`/admin/recruitment/messages?id=${m.id}`}
                      >
                        {m.subject}
                      </Link>
                      <Badge value={m.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No invitations prepared yet.
                </p>
              )}
            </Panel>
            <Panel title="Follow-up tasks">
              <TaskList
                items={(prospect.tasks || []).filter(
                  (task) => !task.cancelledAt,
                )}
                onComplete={async (taskId) => {
                  await action("complete_task", { id: taskId });
                }}
              />
              <div className="mt-5">
                <TaskForm actor={actor} prospect={prospect} onSaved={load} />
              </div>
            </Panel>
            <Panel title="Activity history">
              <ul className="space-y-3">
                {prospect.activities?.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-3 border-b pb-3 text-sm"
                  >
                    <span>{label(item.action)}</span>
                    <time className="text-xs text-slate-400">
                      {date(item.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function LeadOpportunities({ actor }: { actor: Actor }) {
  const search = useSearchParams();
  const chosenId = search.get("lead");
  const [leadId, setLeadId] = useState(chosenId || "");
  const [selected, setSelected] = useState<string[]>(
    search.get("prospectId") ? [search.get("prospectId")!] : [],
  );
  const [page, setPage] = useState(1);
  const { data, error, loading, load } = useData<{
    items: Lead[];
    count: number;
  }>(`view=leads&page=${page}`);
  const { data: matches, error: matchError } = useData<{
    lead: Lead;
    items: (Prospect & {
      score: number;
      reasons: string[];
      requiresReview: boolean;
    })[];
    truncated: boolean;
  }>(leadId ? `view=matches&id=${encodeURIComponent(leadId)}` : "view=leads");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const router = useRouter();
  async function prepare() {
    setBusy(true);
    setActionError("");
    try {
      await mutate("prepare", {
        quoteRequestId: leadId,
        prospectIds: selected,
      });
      router.push("/admin/recruitment/messages");
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <State error={error || actionError} loading={loading} />
      <p className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm leading-6 text-teal-800">
        Customer-approved summaries only. Names, phone numbers, email addresses,
        street addresses and free-form notes remain private.
      </p>
      <Panel title="Moving requests">
        {data?.items.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.items.map((lead) => (
              <button
                key={lead.id}
                onClick={() => {
                  setLeadId(lead.id);
                  setSelected([]);
                }}
                className={`rounded-xl border p-4 text-left ${leadId === lead.id ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-teal-300"}`}
              >
                <p className="font-bold">
                  {lead.origin} <span className="text-teal-600">→</span>{" "}
                  {lead.destination}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {lead.moveDate} · {lead.bedrooms} bedrooms · {lead.property}
                </p>
                <span className="mt-3 inline-block text-xs font-bold text-teal-700">
                  Create Mover Invitation →
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title="No authorised summaries yet"
            detail="New customer requests appear here when the customer chooses to allow general recruitment summaries. Older requests are excluded."
          />
        )}
        <div className="mt-4 flex justify-between text-xs">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <button
            disabled={!data || data.count <= page * 50}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </Panel>
      {leadId && (
        <Panel
          title="Suggested moving companies"
          action={
            <div className="flex flex-wrap gap-2">
              {actor.role === "OWNER" && (
                <button
                  className={secondaryClass}
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Withdraw recruitment permission for this lead and cancel unsent drafts?",
                      )
                    )
                      return;
                    setBusy(true);
                    try {
                      await mutate("withdraw_lead_permission", { id: leadId });
                      setLeadId("");
                      await load();
                    } catch (error) {
                      setActionError((error as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Withdraw summary permission
                </button>
              )}
              <button
                className={buttonClass}
                disabled={busy || !selected.length || selected.length > 20}
                onClick={prepare}
              >
                Prepare {selected.length || ""} invitation
                {selected.length === 1 ? "" : "s"}
              </button>
            </div>
          }
        >
          <State error={matchError} loading={!matches} />
          <p className="mb-4 text-xs text-slate-500">
            Preparing creates individual drafts. Review each email and approve
            sending separately. Up to 20 drafts at a time.
          </p>
          {matches?.items?.length ? (
            <ul className="divide-y divide-slate-100">
              {matches.items.map((p) => (
                <li key={p.id} className="py-4">
                  <label className="flex items-start gap-3">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      disabled={!validBusinessEmail(p.email)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, p.id]
                            : selected.filter((id) => id !== p.id),
                        )
                      }
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{p.companyName}</span>
                        <Badge
                          value={
                            p.requiresReview ? "REVIEW_REQUIRED" : p.status
                          }
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {p.reasons.join(" · ")}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {p.email || "No email — manual contact follow-up required"} · Contact permission: {label(p.consentBasis)}
                      </p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="No eligible companies found"
              detail="Add companies and record service coverage and contact permission. Suppressed and closed recruitments are excluded."
            />
          )}
          {matches?.truncated && (
            <p className="mt-3 text-xs text-amber-700">
              Showing suggestions from the first 500 eligible companies. Review
              service coverage before selecting.
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}

function Messages({ actor }: { actor: Actor }) {
  const search = useSearchParams();
  const id = search.get("id");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const station = useData<EmailStationData>(`view=email_station&message=${encodeURIComponent(id || "")}`);
  const { data, error, loading, load } = useData<Message[]>(
    `view=messages&page=${page}${id ? `&id=${encodeURIComponent(id)}` : `${status ? `&status=${status}` : ""}${kind ? `&kind=${kind}` : ""}`}`,
  );
  return (
    <div className="space-y-5">
      <State error={station.error} loading={station.loading} />
      {!id && station.data && <>
        <div className="grid gap-3 sm:grid-cols-3">
          {([["DRAFT", "Saved drafts", station.data.drafts], ["SENT", "SMTP accepted", station.data.sent], ["NEEDS_REVIEW", "Needs review", station.data.needsReview]] as const).map(([value, title, count]) =>
            <button key={value} onClick={() => { setStatus(value); setPage(1); }} className={`rounded-2xl border bg-white p-5 text-left transition hover:border-teal-500 ${status === value ? "border-teal-600 ring-1 ring-teal-600" : "border-slate-200"}`}><span className="text-xs font-semibold text-slate-500">{title}</span><span className="mt-2 block text-3xl font-black">{count}</span></button>)}
        </div>
        <GeneralEmailComposer key={`${search.get("company") || ""}:${search.get("compose") || ""}`} station={station.data} />
        <div className="flex flex-wrap items-end justify-between gap-3 pt-3">
          <div><h2 className="text-xl font-bold">Drafts & sending history</h2><p className="mt-1 text-xs text-slate-500">SMTP accepted means your mail server accepted the email; inbox delivery is not confirmed.</p></div>
          <div className="flex flex-wrap gap-3">
            <Field title="Status"><select className={inputClass} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option value="DRAFT">Drafts</option><option value="SENT">SMTP accepted</option><option value="NEEDS_REVIEW">Needs review</option><option value="SENDING">Sending</option><option value="CANCELLED">Cancelled</option></select></Field>
            {actor.canViewLeads && <Field title="Email type"><select className={inputClass} value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="">All email types</option><option value="general">General introductions</option><option value="lead">Lead invitations</option></select></Field>}
          </div>
        </div>
      </>}
      <State error={error} loading={loading} />
      {id && (
        <Link
          className="text-sm font-bold text-teal-700"
          href="/admin/recruitment/messages"
        >
          ← Sending history
        </Link>
      )}
      {data?.length
        ? data.map((message) => (
            <EmailReview
              key={`${message.id}:${message.updatedAt}`}
              actor={actor}
              message={message}
              sendingReady={station.data?.sendingReady ?? false}
              onSaved={async () => { await Promise.all([load(), station.load()]); }}
              expanded={Boolean(id) || data.length === 1}
            />
          ))
        : !loading && (
            <Empty
              title="No emails in this view yet"
              detail="Choose a company above and prepare your first introduction, or change the history filters. A customer lead is not required."
            />
          )}
      {!id && (
        <div className="flex justify-between text-sm">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <button
            disabled={!data || data.length < 50}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
type EmailStationData = {
  template: string;
  senderIdentity: string;
  sendingReady: boolean;
  drafts: number;
  sent: number;
  needsReview: number;
};

function GeneralEmailComposer({ station }: { station: EmailStationData }) {
  const router = useRouter();
  const search = useSearchParams();
  const [companySearch, setCompanySearch] = useState(search.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(companySearch);
  const [companyId, setCompanyId] = useState(search.get("company") || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(companySearch), 250);
    return () => clearTimeout(timer);
  }, [companySearch]);
  const companies = useData<{ items: Prospect[]; count: number }>(`view=prospects&sort=name&q=${encodeURIComponent(debouncedSearch)}`);
  const company = companies.data?.items.find(item => item.id === companyId);
  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (!companyId || !validBusinessEmail(company?.email)) return;
    setBusy(true);
    setError("");
    try {
      const message = await mutate<Message>("prepare_general", { prospectId: companyId });
      router.push(`/admin/recruitment/messages?id=${message.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not prepare email.");
    } finally { setBusy(false); }
  }
  return <Panel title="Write a company introduction" action={<span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">No lead required</span>}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={prepare} className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">Invite a mover to join Match &apos;n Move at any time. Choose a company, then review and personalise the prefilled email before sending.</p>
        <Field title="Find a company"><input className={inputClass} type="search" placeholder="Search company name or email" value={companySearch} onChange={e => { setCompanySearch(e.target.value); setCompanyId(""); }} /></Field>
        <Field title="Choose recipient company"><select required className={inputClass} value={companyId} onChange={e => setCompanyId(e.target.value)}><option value="">Choose a company…</option>{companies.data?.items.map(item => <option key={item.id} value={item.id} disabled={!validBusinessEmail(item.email)}>{item.companyName} · {item.email || "Missing email — follow-up required"}</option>)}</select></Field>
        <Link className="inline-block text-sm font-semibold text-teal-700 underline" href="/admin/recruitment/prospects?contact=email">Missing-email follow-up list →</Link>
        <State error={companies.error} loading={companies.loading} />
        {companies.data && companies.data.count > 50 && <p className="text-xs text-slate-500">Showing the first 50 matches. Search by name or email to find another company.</p>}
        {company && <div className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold">To: {company.email}</p><p className="mt-1 text-xs text-slate-500">{company.contactName || company.companyName}</p>{(company.consentBasis === "UNKNOWN" || !company.consentEvidence?.trim()) && <p className="mt-2 text-xs text-amber-800">Review this company&apos;s contact permission before preparing an invitation. <Link className="font-bold underline" href={`/admin/recruitment/prospects?id=${company.id}`}>Open company</Link></p>}</div>}
        <State error={error} loading={false} />
        <div className="flex flex-wrap items-center gap-3"><button className={buttonClass} disabled={busy || !companyId || !validBusinessEmail(company?.email)}>{busy ? "Preparing…" : "Prepare email preview"}<ArrowRight size={16} /></button><Link className={secondaryClass} href="/admin/recruitment/prospects?new=1"><Plus size={16} />Add company</Link></div>
        {!station.sendingReady && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">You can prepare drafts. Sending becomes available once the owner enables outreach and verifies the sender in Email templates &amp; settings.</p>}
      </form>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Prefilled introduction template</p>
        <h3 className="mt-3 font-bold">An invitation to join Match &apos;n Move</h3>
        <p className="mt-4 text-sm leading-7 text-slate-600">Hi {company?.companyName || "[company name]"},</p>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{station.template}</p>
        <p className="mt-4 text-xs leading-6 text-slate-500">Your preview includes the company&apos;s registration link, sender details and unsubscribe option. Existing drafts reopen without creating duplicates.</p>
      </div>
    </div>
  </Panel>;
}
function EmailReview({
  actor,
  message,
  onSaved,
  expanded,
  sendingReady,
}: {
  actor: Actor;
  message: Message;
  onSaved: () => Promise<void>;
  expanded: boolean;
  sendingReady: boolean;
}) {
  const [open, setOpen] = useState(expanded);
  const [intro, setIntro] = useState(message.introduction);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function action(name: string) {
    setBusy(true);
    setError("");
    try {
      await mutate(name, {
        id: message.id,
        updatedAt: message.updatedAt,
        ...(name === "send" ? { confirmed: true } : { introduction: intro }),
      });
      await onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([message.html], { type: "text/html" }),
            "text/plain": new Blob([message.text], { type: "text/plain" }),
          }),
        ]);
      } else await navigator.clipboard.writeText(message.text);
      setNotice("Email copied.");
    } catch {
      try {
        await navigator.clipboard.writeText(message.text);
        setNotice("Plain-text email copied.");
      } catch {
        setError("Clipboard unavailable. Use the plain-text version below.");
      }
    }
  }
  return (
    <Panel
      title={message.prospect?.companyName || message.subject}
      action={
        <div className="flex items-center gap-3">
          <Badge value={message.status} />
          <button
            className="text-xs font-bold text-teal-700"
            onClick={() => setOpen(!open)}
          >
            {open ? "Close preview" : "Preview Email"}
          </button>
        </div>
      }
    >
      <p className="text-sm font-semibold">{message.subject}</p>
      <p className="mt-1 text-xs text-slate-500">
        To: {message.prospect?.email} · Sent: {date(message.sentAt)}
      </p>
      <p className="mt-2 text-xs font-semibold text-teal-700">{message.quoteRequestId ? "Lead invitation" : "General introduction · no customer lead"}</p>
      {open && (
        <div className="mt-5 space-y-4">
          {message.status === "DRAFT" && (
            <Field title="Edit personal introduction">
              <textarea
                className={inputClass}
                rows={4}
                maxLength={1500}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
              />
            </Field>
          )}
          <div className="flex flex-wrap gap-2">
            <button className={secondaryClass} onClick={copy}>
              Copy Email
            </button>
            {message.status === "SENT" && (
              <button
                className={secondaryClass}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await mutate("prepare_followup", { id: message.id });
                    await onSaved();
                    setNotice(
                      "Follow-up draft prepared. Review it in the Email station.",
                    );
                  } catch (error) {
                    setError((error as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Prepare follow-up draft
              </button>
            )}
            {message.status === "DRAFT" && (
              <>
                <button
                  className={secondaryClass}
                  disabled={busy}
                  onClick={() => action("edit_draft")}
                >
                  Save Draft
                </button>
                <button
                  className={buttonClass}
                  disabled={
                    busy || !actor.canSend || !sendingReady || intro !== message.introduction
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        `Send this invitation to ${message.prospect?.email}? Confirm you have reviewed its content and recorded the contact permission evidence.`,
                      )
                    )
                      void action("send");
                  }}
                >
                  {busy ? "Processing…" : "Approve & Send Email"}
                </button>
              </>
            )}
          </div>
          {!actor.canSend && message.status === "DRAFT" && (
            <p className="text-xs text-amber-700">
              Your owner must enable sending permission. You can prepare and
              review drafts.
            </p>
          )}
          {!sendingReady && message.status === "DRAFT" && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Sending is not ready yet. The owner needs to verify the sender connection, add business contact details and enable outreach in {actor.role === "OWNER" ? <Link className="font-bold underline" href="/admin/recruitment/settings">Email templates &amp; settings</Link> : "Email templates & settings"}.</p>}
          {intro !== message.introduction && (
            <p className="text-xs text-amber-700">
              Save the draft to refresh its preview before sending.
            </p>
          )}
          <State error={error || message.lastError || ""} loading={false} />
          {notice && (
            <p role="status" className="text-xs text-teal-700">
              {notice}
            </p>
          )}
          <iframe
            title={`Invitation preview for ${message.prospect?.companyName || "company"}`}
            srcDoc={message.html}
            sandbox=""
            className="h-[650px] w-full rounded-xl border border-slate-200 bg-white"
          />
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-slate-600">
              Plain-text version
            </summary>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-6">
              {message.text}
            </pre>
          </details>
        </div>
      )}
    </Panel>
  );
}

function TaskList({
  items,
  onComplete,
}: {
  items: Task[];
  onComplete: (id: string) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  return (
    <>
      <State error={error} loading={false} />
      <ul className="space-y-3">
        {items.map((task) => (
          <li
            key={task.id}
            className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
          >
            <button
              aria-label={`Complete ${task.title}`}
              disabled={Boolean(task.completedAt) || busy === task.id}
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${task.completedAt ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 hover:border-teal-600"}`}
              onClick={async () => {
                setBusy(task.id);
                try {
                  await onComplete(task.id);
                } catch (error) {
                  setError((error as Error).message);
                } finally {
                  setBusy("");
                }
              }}
            >
              {task.completedAt && <Check size={14} />}
            </button>
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold ${task.completedAt ? "text-slate-400 line-through" : "text-slate-800"}`}
              >
                {task.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {date(task.dueAt)} · {label(task.priority)} priority
              </p>
              {task.description && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {task.description}
                </p>
              )}
              {task.prospectId && (
                <Link
                  className="mt-2 inline-block text-xs font-bold text-teal-700"
                  href={`/admin/recruitment/prospects?id=${task.prospectId}`}
                >
                  Open company →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
function TaskForm({
  actor,
  prospect,
  onSaved,
}: {
  actor: Actor;
  prospect?: Prospect;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [assignee, setAssignee] = useState(
    prospect?.assignedAdminId || actor.id,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: team } = useData<{ users: TeamUser[] }>(
    actor.role === "OWNER" ? "view=team" : "view=tasks",
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await mutate("create_task", {
        title,
        description,
        dueAt: new Date(due).toISOString(),
        priority,
        assignedAdminId: assignee,
        ...(prospect ? { prospectId: prospect.id } : {}),
      });
      setTitle("");
      setDescription("");
      await onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field title="Task title">
        <input
          className={inputClass}
          minLength={3}
          maxLength={200}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field title="Description">
        <textarea
          className={inputClass}
          rows={2}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field title="Due date & time (your timezone)">
          <input
            className={inputClass}
            type="datetime-local"
            required
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </Field>
        <Field title="Priority">
          <select
            className={inputClass}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {["LOW", "NORMAL", "HIGH"].map((p) => (
              <option key={p} value={p}>
                {label(p)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {actor.role === "OWNER" && !prospect && (
        <Field title="Assigned team member">
          <select
            className={inputClass}
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            {team?.users
              ?.filter((u) => !u.adminDisabledAt)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
          </select>
        </Field>
      )}
      <State error={error} loading={false} />
      <button className={secondaryClass} disabled={busy}>
        Create task
      </button>
    </form>
  );
}
function Tasks({ actor }: { actor: Actor }) {
  const { data, error, loading, load } = useData<Task[]>("view=tasks");
  const [create, setCreate] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className={buttonClass} onClick={() => setCreate(!create)}>
          <Plus size={16} />
          New task
        </button>
      </div>
      {create && (
        <Panel title="Create a recruitment task">
          <TaskForm
            actor={actor}
            onSaved={async () => {
              setCreate(false);
              await load();
            }}
          />
        </Panel>
      )}
      <State error={error} loading={loading} />
      <Panel title="Personal task queue">
        {data?.length ? (
          <TaskList
            items={data}
            onComplete={async (id) => {
              await mutate("complete_task", { id });
              await load();
            }}
          />
        ) : (
          <Empty
            title="No outstanding tasks"
            detail="Approved invitations create follow-up tasks automatically when enabled. You can also create tasks for the next action."
          />
        )}
      </Panel>
    </div>
  );
}

function Team({ actor }: { actor: Actor }) {
  const { data, error, loading, load } = useData<{
    users: TeamUser[];
    invitations: Invitation[];
  }>("view=team");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("RECRUITMENT_ADMIN");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function action(action: string, data: unknown) {
    setBusy(true);
    setActionError("");
    try {
      await mutate(action, data);
      setNotice(
        action === "send_invitation"
          ? "Invitation submitted to the verified email flow. Check delivery logs."
          : "Team updated.",
      );
      await load();
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <State error={error || actionError} loading={loading} />
      {notice && (
        <p role="status" className="text-sm text-teal-700">
          {notice}
        </p>
      )}
      <Panel title="Invite a team member">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action("invite", { name, email, role });
          }}
          className="grid items-end gap-4 md:grid-cols-4"
        >
          <Field title="Name">
            <input
              className={inputClass}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tiaan"
            />
          </Field>
          <Field title="Email">
            <input
              className={inputClass}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Team member's email"
            />
          </Field>
          <Field title="Role">
            <select
              className={inputClass}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="RECRUITMENT_ADMIN">Recruitment admin</option>
              <option value="OWNER">Owner</option>
            </select>
          </Field>
          <button className={buttonClass} disabled={busy}>
            Prepare invitation
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          Preparation does not send an email. Review the recipient below, then
          send their secure password-setup invitation.
        </p>
      </Panel>
      <Panel title="Team members">
        <div className="space-y-4">
          {data?.users.map((user) => (
            <TeamMember
              key={`${user.id}:${user.adminDisabledAt}:${user.adminRole}:${user.canSendRecruitment}:${user.canViewRecruitmentLeads}`}
              user={user}
              self={actor.id === user.id}
              busy={busy}
              onSave={(data) => action("team_update", data)}
              onRecover={() =>
                action("team_recovery", { id: user.id, confirmed: true })
              }
            />
          ))}
        </div>
      </Panel>
      <Panel title="Account invitations">
        {data?.invitations.length ? (
          <ul className="divide-y">
            {data.invitations.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="text-sm font-bold">
                    {invite.name}{" "}
                    <span className="font-normal text-slate-500">
                      · {invite.email}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {label(invite.role)} ·{" "}
                    {invite.acceptedAt
                      ? `Accepted ${date(invite.acceptedAt)}`
                      : invite.revokedAt
                        ? "Revoked"
                        : invite.sentAt
                          ? `Issued ${date(invite.sentAt)} · expires ${date(invite.expiresAt)}`
                          : "Prepared — not sent"}
                  </p>
                </div>
                {!invite.acceptedAt && !invite.revokedAt && (
                  <div className="flex gap-2">
                    <button
                      disabled={busy}
                      className={secondaryClass}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Send a secure account invitation to ${invite.email}?`,
                          )
                        )
                          void action("send_invitation", {
                            id: invite.id,
                            confirmed: true,
                          });
                      }}
                    >
                      Send secure invitation
                    </button>
                    <button
                      disabled={busy}
                      className="px-2 text-xs text-red-700"
                      onClick={() => {
                        if (window.confirm("Revoke this invitation?"))
                          void action("revoke_invitation", { id: invite.id });
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="No pending invitations"
            detail="Prepare an invitation for Tiaan after his email is supplied. Carli's invitation is staged by the recruitment migration."
          />
        )}
      </Panel>
    </div>
  );
}
function TeamMember({
  user,
  self,
  busy,
  onSave,
  onRecover,
}: {
  user: TeamUser;
  self: boolean;
  busy: boolean;
  onSave: (data: unknown) => Promise<void>;
  onRecover: () => Promise<void>;
}) {
  const [role, setRole] = useState(user.adminRole || "OWNER");
  const [canSend, setCanSend] = useState(user.canSendRecruitment);
  const [canViewLeads, setCanViewLeads] = useState(
    user.canViewRecruitmentLeads,
  );
  const [disabled, setDisabled] = useState(Boolean(user.adminDisabledAt));
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">
            {user.name || user.email}
            {self ? " (you)" : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {user.email} · Last sign-in {date(user.lastSignInAt)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {user._count.assignedProspects} assigned companies ·{" "}
            {user._count.recruitmentTasks} total tasks
          </p>
        </div>
        <Link
          className="text-xs font-bold text-teal-700"
          href="/admin/recruitment/performance"
        >
          View performance →
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <select
          aria-label={`Role for ${user.name}`}
          disabled={self}
          className={`${inputClass} sm:w-44`}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="OWNER">Owner</option>
          <option value="RECRUITMENT_ADMIN">Recruitment admin</option>
        </select>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            disabled={self}
            checked={canViewLeads}
            onChange={(e) => setCanViewLeads(e.target.checked)}
          />
          Lead summaries
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            disabled={self}
            checked={canSend}
            onChange={(e) => setCanSend(e.target.checked)}
          />
          Send invitations
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            disabled={self}
            checked={disabled}
            onChange={(e) => setDisabled(e.target.checked)}
          />
          Disable access
        </label>
        <button
          className={secondaryClass}
          disabled={self || busy}
          onClick={() => {
            if (
              window.confirm(
                `Save permissions for ${user.name || user.email}? Existing sessions will be invalidated.`,
              )
            )
              void onSave({
                id: user.id,
                role,
                canSend,
                canViewLeads,
                disabled,
              });
          }}
        >
          Save permissions
        </button>
        <button
          className={secondaryClass}
          disabled={busy || Boolean(user.adminDisabledAt)}
          onClick={() => {
            if (
              window.confirm(
                `Send an account recovery link to ${user.email}? Existing sessions will be invalidated.`,
              )
            )
              void onRecover();
          }}
        >
          Send recovery link
        </button>
      </div>
    </div>
  );
}

type Config = {
  sendingEnabled: boolean;
  senderIdentity: string;
  dailyLimit: number;
  followUpDays: number;
  autoTasks: boolean;
  introduction: string;
  generalIntroduction: string;
};
function OutreachSettings() {
  const { data, error, loading, load } = useData<{
    settings: Config;
    emailReady: boolean;
    senderAddress: string;
  }>("view=settings");
  return (
    <>
      <State error={error} loading={loading} />
      {data && (
        <SenderVerification verified={data.emailReady} sender={data.senderAddress} onVerified={load} />
      )}
      {data && (
        <SettingsForm
          key={JSON.stringify(data.settings)}
          initial={data.settings}
          emailReady={data.emailReady}
          onSaved={load}
        />
      )}
      <div className="mt-5">
        <SuppressionForm />
      </div>
    </>
  );
}
function SenderVerification({ verified, sender, onVerified }: { verified: boolean; sender: string; onVerified: () => Promise<void> }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  return <div className="mb-5"><Panel title="Sender connection">
    <p className="text-sm text-slate-600">Sender: <strong>{sender || "Not configured"}</strong></p>
    <p className="mt-2 text-sm leading-6 text-slate-500">{verified ? "Your email connection is verified. Enable sending below when you are ready." : "Confirm your sender, then check the email connection here. This check sends no email."}</p>
    {!verified && <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I confirm this business email address is authorised to send our recruitment invitations.</label>}
    <button className={`${secondaryClass} mt-4`} disabled={busy || !sender || (!verified && !confirmed)} onClick={async () => { setBusy(true); setError(""); try { const result = await mutate<{ message: string }>("verify_sender", { confirmed: true }); setNotice(result.message); await onVerified(); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } }}>{busy ? "Checking…" : verified ? "Recheck connection" : "Verify sender connection"}</button>
    <State error={error} loading={false} />{notice && <p role="status" className="mt-3 text-sm text-teal-700">{notice}</p>}
    <p className="mt-3 text-xs leading-5 text-slate-500">The check verifies connection and authentication. It does not confirm recipient inbox delivery or domain authentication.</p>
  </Panel></div>;
}
function SuppressionForm() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm(`Block further recruitment outreach to ${email}?`))
      return;
    setBusy(true);
    try {
      await mutate("suppress_contact", { email, reason });
      setSaved(true);
      setError("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Contact suppression">
      <form onSubmit={submit} className="max-w-3xl space-y-4">
        <p className="text-sm leading-6 text-slate-500">
          Record unsubscribe requests received by reply, or manually reviewed
          bounce and complaint reports. This immediately blocks further outreach
          and cancels pending follow-ups.
        </p>
        <Field title="Business email">
          <input
            className={inputClass}
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field title="Reason">
          <input
            className={inputClass}
            minLength={3}
            maxLength={500}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <State error={error} loading={false} />
        <button className={secondaryClass} disabled={busy}>
          Add suppression
        </button>
        {saved && (
          <p role="status" className="text-sm text-teal-700">
            Outreach has been blocked for this email.
          </p>
        )}
      </form>
    </Panel>
  );
}
function SettingsForm({
  initial,
  emailReady,
  onSaved,
}: {
  initial: Config;
  emailReady: boolean;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await mutate("settings", form);
      setSaved(true);
      await onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Email templates & recruitment settings">
      <form onSubmit={submit} className="max-w-3xl space-y-5">
        <p
          className={`rounded-xl p-4 text-sm ${emailReady ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"}`}
        >
          {emailReady
            ? "SMTP outreach configuration is marked verified."
            : "Verify the sender connection above before enabling sending."}
        </p>
        <Field title="Sender identification & contact details">
          <textarea
            className={inputClass}
            rows={3}
            required
            maxLength={300}
            value={form.senderIdentity}
            onChange={(e) =>
              setForm({ ...form, senderIdentity: e.target.value })
            }
            placeholder="Match 'n Move · business contact details"
          />
        </Field>
        <Field title="General introduction template (no lead required)">
          <textarea className={inputClass} rows={6} minLength={20} maxLength={1500} required value={form.generalIntroduction} onChange={e => setForm({ ...form, generalIntroduction: e.target.value })} />
        </Field>
        <Field title="Lead invitation template">
          <textarea
            className={inputClass}
            rows={5}
            minLength={20}
            maxLength={1500}
            value={form.introduction}
            onChange={(e) => setForm({ ...form, introduction: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field title="Per-admin limit (rolling 24 hours)">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={100}
              value={form.dailyLimit}
              onChange={(e) =>
                setForm({ ...form, dailyLimit: Number(e.target.value) })
              }
            />
          </Field>
          <Field title="Follow-up reminder after (days)">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={60}
              value={form.followUpDays}
              onChange={(e) =>
                setForm({ ...form, followUpDays: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.autoTasks}
            onChange={(e) => setForm({ ...form, autoTasks: e.target.checked })}
          />
          Create follow-up and registration assistance tasks
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            disabled={!emailReady && !form.sendingEnabled}
            checked={form.sendingEnabled}
            onChange={(e) =>
              setForm({ ...form, sendingEnabled: e.target.checked })
            }
          />
          Enable individually approved outreach sending
        </label>
        <p className="text-xs leading-6 text-slate-500">
          Each message requires a recorded permission basis, an unsuppressed
          recipient, a reviewed draft and explicit send confirmation. Selecting
          companies only creates drafts. Replies are recorded by the assigned
          admin through recruitment status updates.
        </p>
        <State error={error} loading={false} />
        <button disabled={busy} className={buttonClass}>
          Save settings
        </button>
        {saved && (
          <p role="status" className="text-sm text-teal-700">
            Settings saved.
          </p>
        )}
      </form>
    </Panel>
  );
}
