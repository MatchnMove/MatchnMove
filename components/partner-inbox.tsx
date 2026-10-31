"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  Check,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { CompanyStageSelect } from "@/components/company-stage-select";
import { statuses } from "@/lib/recruitment-stages";

type Person = {
  id: string;
  name: string | null;
  email: string;
  canAccessPartnerInbox?: boolean;
  canSendPartnerInbox?: boolean;
  owner?: boolean;
};
type Company = {
  id: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  status: string;
  version: number;
  consentBasis: string;
  assignedAdminId: string;
};
type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  scanStatus: string;
};
type Message = {
  parentMessageId: string | null;
  composeText: string | null;
  conversationId: string;
  inReplyTo: string | null;
  id: string;
  from: string;
  replyTo: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html: string | null;
  status: string;
  direction: string;
  receivedAt: string;
  sentAt: string | null;
  version: number;
  authorId: string | null;
  purpose: Purpose;
  serviceReason: string | null;
  attachments: Attachment[];
  lastError: string | null;
  author?: Person;
};
type Task = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  priority: string;
  completedAt: string | null;
  cancelledAt: string | null;
  conversation?: { id: string; subject: string };
};
type Conversation = {
  companyHistory?: Array<{
    id: string;
    subject: string;
    status: string;
    lastMessageAt: string;
  }>;
  id: string;
  subject: string;
  preview: string;
  participants: string[];
  status: string;
  waitingFor: string;
  unread: boolean;
  archived: boolean;
  spam: boolean;
  labels: string[];
  lastMessageAt: string;
  version: number;
  prospect: Company | null;
  assignedAdmin: Person | null;
  assignedAdminId: string | null;
  draftOwnerId: string | null;
  draftLeaseUntil: string | null;
  providerChangeError?: string | null;
  messages?: Message[];
  notes?: Array<{
    id: string;
    text: string;
    createdAt: string;
    author: Person;
  }>;
  activities?: Array<{ id: string; action: string; createdAt: string }>;
  tasks?: Task[];
  mover?: {
    id: string;
    companyName: string;
    phone: string | null;
    contactPerson: string | null;
    status: string;
    user: { email: string; emailVerifiedAt: string | null };
  } | null;
  communicationHistory?: Array<{
    id: string;
    subject: string;
    status: string;
    sentAt: string | null;
  }>;
  messageCount?: number;
};
type Summary = {
  actor: { id: string; role: string; canInboxSend: boolean };
  configured: boolean;
  latestIncomingAt?: string | null;
  attachmentScanningConfigured?: boolean;
  mailbox: {
    address: string;
    connected: boolean;
    lastSyncedAt?: string | null;
    lastError?: string | null;
    initialSyncComplete?: boolean;
  };
  unread: number;
  waitingTeam: number;
  waitingPartner: number;
  due: number;
  overdue: number;
  resolved: number;
  recent: Array<{
    id: string;
    subject: string;
    lastMessageAt: string;
    unread: boolean;
    assignedAdminId: string | null;
  }>;
};
type Purpose = "REPLY" | "OUTREACH" | "SERVICE";
type Composer = {
  id?: string;
  version?: number;
  conversationId?: string;
  prospectId?: string;
  mode: "new" | "reply" | "replyAll" | "forward";
  parentId?: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  text: string;
  purpose: Purpose;
  serviceReason: string;
  attachmentIds?: string[];
};
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50";
const folders = [
  ["inbox", "Inbox"],
  ["unread", "Unread"],
  ["sent", "Sent"],
  ["drafts", "Drafts"],
  ["archived", "Archived"],
  ["spam", "Spam"],
  ["assigned", "Assigned to me"],
  ["followups", "Follow-ups"],
  ["awaiting", "Awaiting partner"],
  ["overdue", "Overdue"],
  ["all", "All conversations"],
];
const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-NZ", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Pacific/Auckland",
      }).format(new Date(value))
    : "—";
async function api<T>(query: string): Promise<T> {
  const response = await fetch(`/api/admin/inbox?${query}`, {
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Inbox unavailable.");
  return data;
}
async function action<T = { ok: boolean }>(
  name: string,
  data: unknown,
): Promise<T> {
  const response = await fetch("/api/admin/inbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: name, data }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Action failed.");
  return result;
}
function emptyComposer(): Composer {
  return {
    mode: "new",
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    text: "",
    purpose: "OUTREACH",
    serviceReason: "",
  };
}
const recipients = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export function PartnerInbox({
  initialId = null,
  initialError = "",
}: { initialId?: string | null; initialError?: string } = {}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [folder, setFolder] = useState("inbox");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [assignee, setAssignee] = useState("");
  const [items, setItems] = useState<Conversation[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [id, setId] = useState<string | null>(initialId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messagePage, setMessagePage] = useState(1);
  const [team, setTeam] = useState<Person[]>([]);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [renderedPreview, setRenderedPreview] = useState<Message | null>(null);
  const [composer, setComposer] = useState<Composer | null>(null);
  const [preview, setPreview] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskView, setTaskView] = useState("outstanding");
  const [notice, setNotice] = useState("");
  const latest = useRef<string | null>(null);
  const reloadSummary = useCallback(async () => {
    const data = await api<Summary>("view=summary");
    setSummary(data);
    const newest = data.latestIncomingAt || null;
    if (latest.current && newest && newest > latest.current)
      setNotice(
        "New email received. Open the latest conversation in the inbox.",
      );
    latest.current = newest;
    return data;
  }, []);
  const reloadList = useCallback(async () => {
    if (folder === "followups") {
      setTasks(await api<Task[]>(`view=tasks&status=${taskView}&page=${page}`));
      return;
    }
    const params = new URLSearchParams({
      view: "list",
      folder,
      q: search,
      page: String(page),
      stage,
      assignee,
    });
    const data = await api<{ items: Conversation[]; count: number }>(
      params.toString(),
    );
    setItems(data.items);
    setCount(data.count);
  }, [folder, search, page, stage, assignee, taskView]);
  const reloadConversation = useCallback(async () => {
    if (!id) return null;
    const data = await api<Conversation>(
      `view=conversation&id=${encodeURIComponent(id)}&page=${messagePage}`,
    );
    setConversation(data);
    return data;
  }, [id, messagePage]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      reloadSummary(),
      reloadList(),
      api<Person[]>("view=team").then(setTeam),
    ])
      .catch((cause) => {
        if (active) setError(cause.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadSummary, reloadList]);
  useEffect(() => {
    const timer = setInterval(() => {
      void Promise.all([
        reloadSummary(),
        reloadList(),
        reloadConversation(),
      ]).catch(() => undefined);
    }, 30000);
    return () => clearInterval(timer);
  }, [reloadSummary, reloadList, reloadConversation]);
  useEffect(() => {
    if (id) void reloadConversation().catch((cause) => setError(cause.message));
  }, [id, reloadConversation]);
  useEffect(() => {
    if (!composer?.conversationId) return;
    const heartbeat = () =>
      action("lease", { id: composer.conversationId }).catch(() =>
        setNotice(
          "Another team member may be drafting. Save checks ownership before changing the draft.",
        ),
      );
    void heartbeat();
    const timer = setInterval(() => {
      void heartbeat();
    }, 45000);
    return () => clearInterval(timer);
  }, [composer?.conversationId]);
  async function run(fn: () => Promise<void>): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      await fn();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function update(data: object) {
    if (!conversation) return;
    await run(async () => {
      await action("update", {
        id: conversation.id,
        version: conversation.version,
        ...data,
      });
      await Promise.all([reloadSummary(), reloadList(), reloadConversation()]);
    });
  }
  function open(value: string) {
    if (
      composer &&
      !window.confirm(
        "Leave this composer? Save the draft first to keep any changes.",
      )
    )
      return;
    setComposer(null);
    setPreview(false);
    setId(value);
    setMessagePage(1);
  }
  function compose(message?: Message, mode: Composer["mode"] = "new") {
    if (!summary?.actor.canInboxSend) return;
    const to =
      mode === "reply" || mode === "replyAll"
        ? message?.replyTo || message?.from || ""
        : "";
    const cc =
      mode === "replyAll" && message
        ? [...new Set([...message.to, ...message.cc])]
            .filter(
              (email) => email !== summary.mailbox.address && email !== to,
            )
            .join(", ")
        : "";
    setComposer({
      ...emptyComposer(),
      mode,
      conversationId: message ? conversation?.id : undefined,
      parentId: message?.id,
      to,
      cc,
      subject: message
        ? `${mode === "forward" ? "Fwd: " : /^re:/i.test(message.subject) ? "" : "Re: "}${message.subject}`
        : "",
      purpose:
        mode === "reply" || mode === "replyAll"
          ? "REPLY"
          : mode === "forward"
            ? "SERVICE"
            : "OUTREACH",
    });
    setPreview(false);
  }
  function resume(message: Message) {
    setComposer({
      ...emptyComposer(),
      id: message.id,
      version: message.version,
      conversationId: conversation?.id,
      mode: message.parentMessageId || message.inReplyTo ? "reply" : "new",
      parentId: message.parentMessageId || undefined,
      to: message.to.join(", "),
      cc: message.cc.join(", "),
      bcc: message.bcc.join(", "),
      subject: message.subject,
      text: message.composeText || message.text,
      purpose: message.purpose,
      serviceReason: message.serviceReason || "",
    });
    setPreview(false);
  }
  async function saveDraft() {
    if (!composer) throw new Error("Open a composer first.");
    const draft = await action<Message>("draft", {
      ...composer,
      to: recipients(composer.to),
      cc: recipients(composer.cc),
      bcc: recipients(composer.bcc),
    });
    setComposer((prior) =>
      prior
        ? {
            ...prior,
            id: draft.id,
            version: draft.version,
            conversationId: draft.conversationId,
            mode: draft.parentMessageId || draft.inReplyTo ? "reply" : "new",
            parentId: draft.parentMessageId || undefined,
            subject: draft.subject,
            attachmentIds: [],
            text: draft.composeText || draft.text,
          }
        : prior,
    );
    setRenderedPreview(draft);
    setConversation(
      await api<Conversation>(`view=conversation&id=${draft.conversationId}`),
    );
    setId(draft.conversationId);
    setNotice("Draft saved. Nothing has been sent.");
    await Promise.all([reloadList(), reloadSummary()]);
    return draft;
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
            Partner communications
          </p>
          <h1 className="mt-2 text-3xl font-black">Inbox</h1>
          <p className="mt-2 text-sm text-slate-500">
            {summary?.mailbox.address || "support@matchnmove.co.nz"} ·{" "}
            {summary?.mailbox.connected
              ? `Last synced ${date(summary.mailbox.lastSyncedAt)}`
              : "Mailbox connection required"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={secondary}
            disabled={
              busy ||
              !summary?.mailbox.connected ||
              summary?.actor.role !== "OWNER"
            }
            onClick={() =>
              void run(async () => {
                await action("sync", {});
                await Promise.all([
                  reloadSummary(),
                  reloadList(),
                  reloadConversation(),
                ]);
              })
            }
          >
            <RefreshCw size={15} />
            Sync
          </button>
          <button
            className={button}
            disabled={!summary?.actor.canInboxSend}
            onClick={() => {
              if (
                !composer ||
                window.confirm("Leave this composer? Save your draft first.")
              ) {
                setId(null);
                setConversation(null);
                compose();
              }
            }}
          >
            <Plus size={16} />
            New email
          </button>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <div
          role="status"
          className="flex justify-between gap-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-900"
        >
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {summary?.actor.role === "OWNER" && (
        <InboxOwnerSetup summary={summary} onSaved={reloadSummary} />
      )}
      {summary?.mailbox.lastError && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {summary.mailbox.lastError}
        </p>
      )}
      {summary && (
        <div className="hidden grid-cols-5 gap-2 text-sm sm:grid">
          {[
            ["Unread", summary.unread],
            ["Awaiting team", summary.waitingTeam],
            ["Awaiting partner", summary.waitingPartner],
            ["Due today", summary.due],
            ["Overdue", summary.overdue],
          ].map(([title, value]) => (
            <div key={title} className="rounded-xl border bg-white p-3">
              <p className="text-xs text-slate-500">{title}</p>
              <p className="mt-1 text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}
      {summary && (
        <details className="rounded-xl border bg-white p-3 text-xs sm:hidden">
          <summary className="cursor-pointer font-semibold">
            {summary.unread} unread · {summary.overdue} overdue follow-ups
          </summary>
          <p className="mt-3 leading-6">
            Awaiting our team: {summary.waitingTeam}
            <br />
            Awaiting partner: {summary.waitingPartner}
            <br />
            Follow-ups due today: {summary.due}
          </p>
        </details>
      )}
      <div className="grid min-h-[600px] gap-4 xl:grid-cols-[160px_330px_minmax(0,1fr)]">
        <nav
          aria-label="Inbox folders"
          className="flex gap-1 overflow-x-auto rounded-2xl border bg-white p-2 xl:block xl:space-y-1 xl:self-start"
        >
          {folders.map(([value, title]) => (
            <button
              key={value}
              onClick={() => {
                setFolder(value);
                setPage(1);
              }}
              className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-semibold xl:w-full ${folder === value ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {title}
              {value === "unread" && summary ? ` (${summary.unread})` : ""}
            </button>
          ))}
        </nav>
        <section
          className={`${id || composer ? "hidden xl:block" : ""} overflow-hidden rounded-2xl border bg-white xl:min-h-[650px]`}
          aria-label="Conversations"
        >
          <div className="space-y-2 border-b p-3">
            <label className="flex items-center gap-2">
              <Search size={16} />
              <input
                aria-label="Search partner email"
                className={input}
                placeholder="Search company, sender or message"
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter pipeline stage"
              className={input}
              value={stage}
              onChange={(event) => {
                setStage(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All pipeline stages</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
            {summary?.actor.role === "OWNER" && (
              <select
                aria-label="Filter conversation assignee"
                className={input}
                value={assignee}
                onChange={(event) => {
                  setAssignee(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All team members</option>
                {team.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name || person.email}
                  </option>
                ))}
              </select>
            )}
          </div>
          {loading && (
            <p role="status" className="p-5 text-sm text-slate-500">
              Loading inbox…
            </p>
          )}
          {folder === "followups" ? (
            <div className="p-3">
              <select
                aria-label="Filter follow-up status"
                className={input}
                value={taskView}
                onChange={(event) => {
                  setTaskView(event.target.value);
                  setPage(1);
                }}
              >
                <option value="outstanding">Outstanding</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
              {tasks.map((task) => (
                <button
                  key={task.id}
                  className="mt-3 block w-full rounded-xl border p-3 text-left text-sm"
                  onClick={() =>
                    task.conversation && open(task.conversation.id)
                  }
                >
                  <strong>{task.title}</strong>
                  <p className="mt-1 text-xs text-slate-500">
                    {date(task.dueAt)} · {task.priority}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => open(item.id)}
                  className={`block w-full border-b p-4 text-left ${item.id === id ? "bg-teal-50" : "hover:bg-slate-50"}`}
                >
                  <div className="flex justify-between gap-2">
                    <span
                      className={`truncate text-sm ${item.unread ? "font-bold" : "font-medium"}`}
                    >
                      {item.prospect?.companyName ||
                        item.participants.find(
                          (email) => email !== summary?.mailbox.address,
                        ) ||
                        "Unlinked conversation"}
                    </span>
                    {item.unread && (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm">{item.subject}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {item.preview}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {date(item.lastMessageAt)} ·{" "}
                    {item.assignedAdmin?.name || "Unassigned"} ·{" "}
                    {label(item.status)}
                  </p>
                </button>
              ))}
              {!loading && !items.length && (
                <p className="p-6 text-sm leading-6 text-slate-500">
                  {summary?.mailbox.connected
                    ? "No conversations match this view."
                    : "Connect the real support mailbox to import conversations. No sample emails are shown."}
                </p>
              )}
            </div>
          )}
          <div className="flex justify-between p-3 text-xs">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {page}
              {folder !== "followups" ? ` · ${count} conversations` : ""}
            </span>
            <button
              disabled={
                folder === "followups" ? tasks.length < 50 : page * 30 >= count
              }
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </section>
        <section
          className="min-w-0 space-y-4"
          aria-label="Conversation details"
        >
          {(id || composer) && (
            <button
              className={`${secondary} xl:hidden`}
              onClick={() => {
                if (
                  composer &&
                  !window.confirm(
                    "Leave this composer? Save the draft first to keep changes.",
                  )
                )
                  return;
                setId(null);
                setComposer(null);
                setConversation(null);
              }}
            >
              <ArrowLeft size={16} />
              Conversation list
            </button>
          )}
          {conversation && id && (
            <>
              <div className="rounded-2xl border bg-white p-4">
                <h2 className="break-words text-xl font-bold">
                  {conversation.subject}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    className={secondary}
                    onClick={() =>
                      void update({ unread: !conversation.unread })
                    }
                  >
                    <Mail size={14} />
                    {conversation.unread ? "Mark read" : "Mark unread"}
                  </button>
                  <button
                    disabled={busy}
                    className={secondary}
                    onClick={() =>
                      void update({ archived: !conversation.archived })
                    }
                  >
                    <Archive size={14} />
                    {conversation.archived ? "Reopen inbox" : "Archive"}
                  </button>
                  <button
                    disabled={busy}
                    className={secondary}
                    onClick={() =>
                      void update({
                        spam: !conversation.spam,
                        ...(conversation.spam
                          ? { archived: false }
                          : { archived: true }),
                      })
                    }
                  >
                    {conversation.spam ? "Not spam" : "Mark spam"}
                  </button>
                  <select
                    aria-label="Conversation status"
                    className="rounded-xl border px-3 text-sm"
                    value={conversation.status}
                    onChange={(event) =>
                      void update({ status: event.target.value })
                    }
                  >
                    <option value="OPEN">Open</option>
                    <option value="PENDING">Pending</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                  {summary?.actor.role === "OWNER" && (
                    <select
                      aria-label="Assign conversation"
                      className="max-w-48 rounded-xl border px-3 text-sm"
                      value={conversation.assignedAdminId || ""}
                      onChange={(event) =>
                        void update({
                          assignedAdminId: event.target.value || null,
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {team.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name || person.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {conversation.providerChangeError && (
                  <p className="mt-2 text-xs text-amber-800">
                    {conversation.providerChangeError}
                  </p>
                )}
                {conversation.draftOwnerId &&
                  conversation.draftOwnerId !== summary?.actor.id &&
                  conversation.draftLeaseUntil &&
                  new Date(conversation.draftLeaseUntil) > new Date() && (
                    <p
                      role="status"
                      className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"
                    >
                      {team.find(
                        (person) => person.id === conversation.draftOwnerId,
                      )?.name || "Another team member"}{" "}
                      is drafting a reply.
                    </p>
                  )}
                <label className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  Waiting for
                  <select
                    aria-label="Waiting for response"
                    className="rounded-lg border p-2"
                    value={conversation.waitingFor}
                    onChange={(event) =>
                      void update({ waitingFor: event.target.value })
                    }
                  >
                    <option value="TEAM">Our team</option>
                    <option value="PARTNER">Moving partner</option>
                  </select>
                </label>
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-semibold">
                    Conversation labels
                    {conversation.labels.length
                      ? ` (${conversation.labels.length})`
                      : ""}
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {[
                      "PRICING_REQUESTED",
                      "REGISTRATION_SENT",
                      "NEEDS_PHONE_CALL",
                      "FOLLOW_UP_REQUIRED",
                      "INFORMATION_REQUESTED",
                      "AWAITING_REGISTRATION",
                    ].map((value) => (
                      <label className="flex items-center gap-2" key={value}>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={conversation.labels.includes(value)}
                          onChange={(event) =>
                            void update({
                              labels: event.target.checked
                                ? [...conversation.labels, value]
                                : conversation.labels.filter(
                                    (item) => item !== value,
                                  ),
                            })
                          }
                        />
                        {label(value)}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-slate-500">
                    Interest and registration stages use the company pipeline
                    below.
                  </p>
                </details>
              </div>
              <div className="flex justify-between text-xs">
                <button
                  disabled={messagePage === 1}
                  onClick={() => setMessagePage(messagePage - 1)}
                >
                  Newer messages
                </button>
                <span>Message page {messagePage}</span>
                <button
                  disabled={
                    messagePage * 30 >= (conversation.messageCount || 0)
                  }
                  onClick={() => setMessagePage(messagePage + 1)}
                >
                  Older messages
                </button>
              </div>
              {conversation.messages?.map((message) => (
                <article
                  key={message.id}
                  className="overflow-hidden rounded-2xl border bg-white p-4"
                >
                  <header className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="break-all text-sm font-bold">
                        {message.from}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        To: {message.to.join(", ")}
                        {message.cc.length
                          ? ` · Cc: ${message.cc.join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400">
                      {date(message.sentAt || message.receivedAt)} ·{" "}
                      {label(message.status)}
                      {message.author &&
                        ` · ${message.author.name || message.author.email}`}
                    </p>
                  </header>
                  <SafeEmailBody message={message} />
                  {message.lastError && (
                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                      {message.lastError}
                    </p>
                  )}
                  {message.attachments.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {message.attachments.map((file) => (
                        <li key={file.id}>
                          <a
                            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 underline"
                            href={`/api/admin/inbox/attachments/${file.id}`}
                          >
                            <Paperclip size={14} />
                            {file.fileName}
                          </a>
                          <span className="ml-2 text-xs text-slate-400">
                            {Math.ceil(file.size / 1024)} KB ·{" "}
                            {file.scanStatus === "CLEAN"
                              ? "Checked"
                              : "Checked before download"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <footer className="mt-4 flex flex-wrap gap-2">
                    {summary?.actor.canInboxSend && (
                      <>
                        {message.status === "PROVIDER_DRAFT" &&
                          summary?.actor.canInboxSend && (
                            <button
                              className={secondary}
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  const adopted = await action<Message>(
                                    "adopt_draft",
                                    {
                                      id: conversation.id,
                                      messageId: message.id,
                                      version: message.version,
                                    },
                                  );
                                  resume(adopted);
                                  await reloadConversation();
                                })
                              }
                            >
                              Continue Gmail draft
                            </button>
                          )}
                        {message.status === "NEEDS_REVIEW" &&
                          summary?.actor.role === "OWNER" && (
                            <button
                              className={secondary}
                              disabled={busy}
                              onClick={() => {
                                const note = window.prompt(
                                  "Check Gmail Sent before restoring this draft. Record what you checked (at least 20 characters). This will search Gmail again and will not send anything.",
                                );
                                if (
                                  note &&
                                  window.confirm(
                                    "I checked Gmail Sent and believe this message was not sent. Restore only if the provider search finds no sent message?",
                                  )
                                )
                                  void run(async () => {
                                    await action("review_send", {
                                      id: message.id,
                                      note,
                                      confirmedNotSent: true,
                                    });
                                    await Promise.all([
                                      reloadConversation(),
                                      reloadList(),
                                      reloadSummary(),
                                    ]);
                                  });
                              }}
                            >
                              Review uncertain send
                            </button>
                          )}
                        {message.status === "DRAFT" ? (
                          <button
                            className={secondary}
                            onClick={() => resume(message)}
                          >
                            Continue draft
                          </button>
                        ) : ![
                            "SENDING",
                            "NEEDS_REVIEW",
                            "DELETED",
                            "PROVIDER_DRAFT",
                          ].includes(message.status) ? (
                          <>
                            <button
                              className={secondary}
                              disabled={message.direction !== "INBOUND"}
                              onClick={() => compose(message, "reply")}
                            >
                              Reply
                            </button>
                            <button
                              className={secondary}
                              disabled={message.direction !== "INBOUND"}
                              onClick={() => compose(message, "replyAll")}
                            >
                              Reply all
                            </button>
                            <button
                              className={secondary}
                              onClick={() => compose(message, "forward")}
                            >
                              Forward
                            </button>
                          </>
                        ) : null}
                      </>
                    )}
                  </footer>
                </article>
              ))}
              <CompanyConversationPanel
                onOpen={open}
                key={conversation.id}
                team={team}
                conversation={conversation}
                owner={summary?.actor.role === "OWNER"}
                busy={busy}
                onAction={async (name, data) =>
                  run(async () => {
                    await action(name, { id: conversation.id, ...data });
                    await Promise.all([
                      reloadConversation(),
                      reloadList(),
                      reloadSummary(),
                    ]);
                  })
                }
                onReload={async () => {
                  await Promise.all([
                    reloadConversation(),
                    reloadList(),
                    reloadSummary(),
                  ]);
                }}
              />
            </>
          )}
          {composer && (
            <form
              className="rounded-2xl border-2 border-teal-600 bg-white p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  await saveDraft();
                  setPreview(true);
                });
              }}
            >
              <div className="flex justify-between gap-3">
                <h2 className="text-lg font-bold">
                  {preview
                    ? "Review before sending"
                    : composer.id
                      ? "Edit draft"
                      : "Compose email"}
                </h2>
                <button
                  type="button"
                  className="text-sm text-slate-500"
                  onClick={() => {
                    if (
                      window.confirm("Close composer? Save any changes first.")
                    ) {
                      setComposer(null);
                      setPreview(false);
                    }
                  }}
                >
                  Close
                </button>
              </div>
              <p className="my-3 text-xs text-slate-500">
                From: Match &apos;n Move &lt;{summary?.mailbox.address}&gt;
              </p>
              <fieldset
                disabled={busy || preview}
                className="space-y-3 disabled:opacity-75"
              >
                {(["to", "cc", "bcc", "subject"] as const).map((field) => (
                  <label className="block text-xs font-semibold" key={field}>
                    {field === "subject" ? "Subject" : field.toUpperCase()}
                    <input
                      required={field === "to" || field === "subject"}
                      className={`${input} mt-1`}
                      value={composer[field]}
                      onChange={(event) =>
                        setComposer({
                          ...composer,
                          [field]: event.target.value,
                        })
                      }
                    />
                  </label>
                ))}
                <label className="block text-xs font-semibold">
                  Message purpose
                  <select
                    className={`${input} mt-1`}
                    value={composer.purpose}
                    onChange={(event) =>
                      setComposer({
                        ...composer,
                        purpose: event.target.value as Purpose,
                      })
                    }
                  >
                    {composer.parentId && composer.mode !== "forward" && (
                      <option value="REPLY">Response to their enquiry</option>
                    )}
                    {composer.purpose === "REPLY" && !composer.parentId && (
                      <option value="REPLY">Response to their enquiry</option>
                    )}
                    <option value="OUTREACH">
                      Promotional / partnership outreach
                    </option>
                    <option value="SERVICE">Operational service message</option>
                  </select>
                </label>
                {composer.purpose === "OUTREACH" && (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    Promotional email still needs reviewed company contact
                    permission and outreach approval. A public address alone
                    does not approve sending.
                  </p>
                )}
                {composer.purpose === "SERVICE" && (
                  <label className="block text-xs font-semibold">
                    Operational reason (internal only)
                    <input
                      minLength={20}
                      required
                      className={`${input} mt-1`}
                      placeholder="Explain the existing service or support reason"
                      value={composer.serviceReason}
                      onChange={(event) =>
                        setComposer({
                          ...composer,
                          serviceReason: event.target.value,
                        })
                      }
                    />
                  </label>
                )}
                <label className="block text-xs font-semibold">
                  Insert a response template
                  <select
                    className={`${input} mt-1`}
                    defaultValue=""
                    onChange={(event) => {
                      const templates: Record<string, string> = {
                        acknowledgement:
                          "Hi,\n\nThanks for getting in touch with Match 'n Move. We have received your message and will review the details.\n\nKind regards,\nThe Match 'n Move Team",
                        documents:
                          "Hi,\n\nThanks for your message. Please sign in to your partner dashboard and open Documents to review any outstanding requirements. Let us know if you need help.\n\nKind regards,\nThe Match 'n Move Team",
                        followup:
                          "Hi,\n\nI am following up on our previous conversation. Please let us know if you need any further information or assistance.\n\nKind regards,\nThe Match 'n Move Team",
                        introduction:
                          "Hi,\n\nWe would like to introduce Match 'n Move and discuss whether our moving quote platform could be useful for your business. Please let us know if you would like more information.\n\nKind regards,\nThe Match 'n Move Team",
                      };
                      if (
                        event.target.value &&
                        (!composer.text ||
                          window.confirm(
                            "Replace the current body with this template?",
                          ))
                      )
                        setComposer({
                          ...composer,
                          text: templates[event.target.value],
                        });
                      event.target.value = "";
                    }}
                  >
                    <option value="">Choose template…</option>
                    {composer.purpose === "OUTREACH" ? (
                      <option value="introduction">
                        Partnership introduction
                      </option>
                    ) : (
                      <>
                        <option value="acknowledgement">
                          Acknowledge enquiry
                        </option>
                        <option value="documents">Document guidance</option>
                        <option value="followup">Conversation follow-up</option>
                      </>
                    )}
                  </select>
                </label>
                <label className="block text-xs font-semibold">
                  Email body
                  <textarea
                    className={`${input} mt-1 min-h-56`}
                    required
                    maxLength={100000}
                    value={composer.text}
                    onChange={(event) =>
                      setComposer({ ...composer, text: event.target.value })
                    }
                  />
                </label>
                {composer.mode === "forward" &&
                  conversation?.messages
                    ?.find((item) => item.id === composer.parentId)
                    ?.attachments.map((file) => (
                      <label className="flex gap-2 text-xs" key={file.id}>
                        <input
                          type="checkbox"
                          disabled={file.scanStatus !== "CLEAN"}
                          checked={
                            composer.attachmentIds?.includes(file.id) || false
                          }
                          onChange={(event) =>
                            setComposer({
                              ...composer,
                              attachmentIds: event.target.checked
                                ? [...(composer.attachmentIds || []), file.id]
                                : composer.attachmentIds?.filter(
                                    (item) => item !== file.id,
                                  ),
                            })
                          }
                        />
                        Forward {file.fileName}
                        {file.scanStatus !== "CLEAN"
                          ? " (download and scan it first)"
                          : ""}
                      </label>
                    ))}
              </fieldset>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label
                  className={`${secondary} ${!composer.id || busy ? "opacity-50" : "cursor-pointer"}`}
                >
                  <Paperclip size={14} />
                  Attach file
                  <input
                    className="sr-only"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx,.pptx"
                    disabled={!composer.id || busy || preview}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file || !composer.id) return;
                      void run(async () => {
                        const form = new FormData();
                        form.set("messageId", composer.id!);
                        form.set("file", file);
                        const response = await fetch(
                          "/api/admin/inbox/attachments",
                          { method: "POST", body: form },
                        );
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error);
                        const current = await api<Conversation>(
                          `view=conversation&id=${composer.conversationId}`,
                        );
                        setConversation(current);
                        const draft = current.messages?.find(
                          (item) => item.id === composer.id,
                        );
                        if (draft)
                          setComposer((prior) =>
                            prior
                              ? { ...prior, version: draft.version }
                              : prior,
                          );
                      });
                    }}
                  />
                </label>
                <span className="text-xs text-slate-400">
                  Save first to attach · 10 MB per file · files must pass
                  scanning
                </span>
              </div>
              {preview && renderedPreview && (
                <section
                  aria-label="Final email preview"
                  className="mt-4 rounded-xl border bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold">
                    Final email · {renderedPreview.subject}
                  </p>
                  <SafeEmailBody message={renderedPreview} />
                </section>
              )}
              {!preview &&
                composer.id &&
                conversation?.messages
                  ?.find((item) => item.id === composer.id)
                  ?.attachments.map((file) => (
                    <div
                      key={file.id}
                      className="mt-2 flex items-center gap-3 text-xs"
                    >
                      <span>{file.fileName}</span>
                      <button
                        type="button"
                        className={secondary}
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await action("remove_attachment", {
                              id: conversation.id,
                              messageId: composer.id,
                              version: composer.version,
                              attachmentId: file.id,
                            });
                            const current = await reloadConversation();
                            const draft = current?.messages?.find(
                              (item) => item.id === composer.id,
                            );
                            if (draft)
                              setComposer({
                                ...composer,
                                version: draft.version,
                              });
                          })
                        }
                      >
                        Remove attachment
                      </button>
                    </div>
                  ))}
              <div className="mt-4 flex flex-wrap gap-2">
                {preview ? (
                  <>
                    <button
                      type="button"
                      className={secondary}
                      onClick={() => setPreview(false)}
                    >
                      Back to editing
                    </button>
                    <button
                      type="button"
                      className={button}
                      disabled={
                        busy || !summary?.mailbox.connected || !composer.id
                      }
                      onClick={() =>
                        void run(async () => {
                          await action("send", {
                            id: composer.id,
                            version: composer.version,
                            confirmed: true,
                          });
                          setComposer(null);
                          setPreview(false);
                          setNotice("Email sent through the support mailbox.");
                          await Promise.all([
                            reloadConversation(),
                            reloadList(),
                            reloadSummary(),
                          ]);
                        })
                      }
                    >
                      <Send size={15} />
                      Confirm and send
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={secondary}
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await saveDraft();
                        })
                      }
                    >
                      Save draft
                    </button>
                    <button type="submit" className={button} disabled={busy}>
                      <ShieldCheck size={15} />
                      Review email
                    </button>
                  </>
                )}
              </div>
              {!summary?.mailbox.connected && (
                <p className="mt-3 text-xs text-amber-800">
                  Sending is unavailable until the owner connects the support
                  mailbox.
                </p>
              )}
            </form>
          )}
          {!conversation && !composer && (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
              <Mail size={32} />
              <h2 className="mt-4 text-lg font-semibold text-slate-800">
                Your partner conversations, together
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6">
                Choose a conversation to read, reply, assign ownership and plan
                the next step.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SafeEmailBody({ message }: { message: Message }) {
  const [formatted, setFormatted] = useState(false);
  return (
    <div className="mt-4">
      {message.html && (
        <button
          className="mb-2 text-xs font-semibold text-teal-700 underline"
          onClick={() => setFormatted(!formatted)}
        >
          {formatted ? "Plain text" : "Safe formatted view"}
        </button>
      )}
      {formatted && message.html ? (
        <iframe
          title={`Email: ${message.subject}`}
          className="h-80 w-full rounded-lg border"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{font:14px/1.6 Arial,sans-serif;overflow-wrap:anywhere;color:#334155}table{max-width:100%}a{color:#0f766e}</style>${message.html}`}
        />
      ) : (
        <div className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
          {message.text || "(No text body)"}
        </div>
      )}
    </div>
  );
}

function InboxOwnerSetup({
  summary,
  onSaved,
}: {
  summary: Summary;
  onSaved: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(!summary.mailbox.connected);
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [team, setTeam] = useState<Person[]>([]);
  useEffect(() => {
    if (open)
      void api<Person[]>("view=access")
        .then(setTeam)
        .catch(() => undefined);
  }, [open]);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="rounded-2xl border bg-white p-4"
    >
      <summary className="cursor-pointer text-sm font-bold">
        {summary.mailbox.connected
          ? "Mailbox connection & team access"
          : "Connect the real support mailbox"}
      </summary>
      <div className="mt-4 space-y-4 text-sm">
        <p>
          Google Workspace hosts this mailbox. Only an owner can connect it; no
          password is stored by this app.
        </p>
        <details open={!summary.configured}>
          <summary className="cursor-pointer text-xs font-semibold">
            Google client settings
          </summary>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
            <li>In Google Cloud, enable the Gmail API.</li>
            <li>
              Configure Google Auth Platform for your Workspace organisation.
              Use Internal audience when available.
            </li>
            <li>
              Create a Web application OAuth client and add this authorised
              redirect URI:
              <code className="my-2 block break-all rounded-lg bg-slate-100 p-3 text-xs">
                https://www.matchnmove.co.nz/api/admin/inbox/oauth/callback
              </code>
            </li>
            <li>
              Enter the client credentials here. They are encrypted on the
              server and are never shown again.
            </li>
          </ol>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              void action("configure", { clientId, clientSecret: secret })
                .then(async () => {
                  setSecret("");
                  setClientId("");
                  await onSaved();
                })
                .catch((cause) => setError(cause.message))
                .finally(() => setBusy(false));
            }}
          >
            <label className="text-xs font-semibold">
              Google OAuth client ID
              <input
                className={`${input} mt-1`}
                required
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="text-xs font-semibold">
              Google OAuth client secret
              <input
                className={`${input} mt-1`}
                type="password"
                required
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <button className={button} disabled={busy}>
              Save secure connection settings
            </button>
          </form>
        </details>
        {!summary.attachmentScanningConfigured && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            Attachment scanning is not configured. Email text works once
            connected; file uploads and downloads remain blocked until the
            server scanner is configured.
          </p>
        )}
        {summary.configured && !summary.mailbox.connected && (
          <a className={button} href="/api/admin/inbox/oauth">
            Connect support@matchnmove.co.nz with Google
          </a>
        )}
        {summary.mailbox.connected && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 font-semibold text-teal-700">
              <Check size={16} />
              Connected as {summary.mailbox.address}
            </span>
            <a className={secondary} href="/api/admin/inbox/oauth">
              Reconnect
            </a>
            <button
              className={secondary}
              onClick={() => {
                if (
                  window.confirm(
                    "Disconnect mailbox sync? Existing stored conversations will remain available.",
                  )
                )
                  void action("disconnect", {})
                    .then(onSaved)
                    .catch((cause) => setError(cause.message));
              }}
            >
              Disconnect
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Initial import covers the latest 30 days. Inbox and Sent synchronise
          in the background; internal notes never leave this app.
        </p>
        <div className="border-t pt-3">
          <h3 className="font-bold">Explicit team access</h3>
          <p className="mt-1 text-xs text-slate-500">
            Owners retain access. Other admins need permission and can only view
            assigned conversations.
          </p>
          {team
            .filter((person) => person.id !== summary.actor.id)
            .map((person) => (
              <InboxTeamAccess
                key={`${person.id}:${person.canAccessPartnerInbox}:${person.canSendPartnerInbox}`}
                person={person}
              />
            ))}
        </div>
      </div>
    </details>
  );
}

function InboxTeamAccess({ person }: { person: Person }) {
  const [read, setRead] = useState(Boolean(person.canAccessPartnerInbox));
  const [send, setSend] = useState(Boolean(person.canSendPartnerInbox));
  const [notice, setNotice] = useState("");
  if (person.owner)
    return (
      <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
        {person.name || person.email} · Owner access
      </p>
    );
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border p-3 text-xs">
      <span className="min-w-40 font-semibold">
        {person.name || person.email}
      </span>
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={read}
          onChange={(event) => {
            setRead(event.target.checked);
            if (!event.target.checked) setSend(false);
          }}
        />
        Inbox access
      </label>
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={send}
          disabled={!read}
          onChange={(event) => setSend(event.target.checked)}
        />
        Send email
      </label>
      <button
        className={secondary}
        onClick={() =>
          void action("access", {
            userId: person.id,
            canAccess: read,
            canSend: send,
          })
            .then(() => setNotice("Saved. The user must sign in again."))
            .catch((cause) => setNotice(cause.message))
        }
      >
        Save access
      </button>
      <span role="status">{notice}</span>
    </div>
  );
}

function CompanyConversationPanel({
  conversation,
  owner,
  busy,
  onAction,
  onReload,
  team,
  onOpen,
}: {
  conversation: Conversation;
  owner: boolean;
  busy: boolean;
  onAction: (name: string, data: Record<string, unknown>) => Promise<boolean>;
  onReload: () => Promise<unknown>;
  team: Person[];
  onOpen: (id: string) => void;
}) {
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [kind, setKind] = useState("FOLLOW_UP");
  const [priority, setPriority] = useState("NORMAL");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [companies, setCompanies] = useState<{
    prospects: Company[];
    movers: Array<{ id: string; companyName: string }>;
  }>({ prospects: [], movers: [] });
  const [link, setLink] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const prospect = conversation.prospect;
  const mover = conversation.mover;
  return (
    <div className="space-y-4">
      <details className="rounded-2xl border bg-white p-4" open>
        <summary className="cursor-pointer font-bold">
          {prospect?.companyName ||
            mover?.companyName ||
            "Company association needed"}
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <p>
            {prospect?.contactName ||
              mover?.contactPerson ||
              "Contact name not recorded"}
          </p>
          <p className="break-all">
            {prospect?.email ||
              mover?.user.email ||
              "No company email recorded"}
          </p>
          <p>{prospect?.phone || mover?.phone || "No phone recorded"}</p>
          {prospect && (
            <>
              <CompanyStageSelect
                id={prospect.id}
                companyName={prospect.companyName}
                status={prospect.status}
                version={prospect.version}
                onSaved={async () => {
                  await onReload();
                }}
              />
              <Link
                className="font-semibold text-teal-700 underline"
                href={`/admin/recruitment/prospects?id=${prospect.id}`}
              >
                Open full company record
              </Link>
            </>
          )}
          {mover && (
            <p>
              Registered partner: {label(mover.status)} ·{" "}
              <Link
                className="text-teal-700 underline"
                href={`/movers/${mover.id}`}
              >
                Partner profile
              </Link>
            </p>
          )}
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">
              Link or correct company
            </summary>
            <input
              className={`${input} mt-2`}
              placeholder="Search company name or email"
              value={companySearch}
              onChange={(event) => setCompanySearch(event.target.value)}
            />
            <button
              className={`${secondary} mt-2`}
              onClick={() =>
                void api<typeof companies>(
                  `view=companies&q=${encodeURIComponent(companySearch)}`,
                ).then(setCompanies)
              }
            >
              Find company
            </button>
            <select
              aria-label="Link company"
              className={`${input} mt-2`}
              value={link}
              onChange={(event) => setLink(event.target.value)}
            >
              <option value="">Choose a company</option>
              {companies.prospects.map((company) => (
                <option key={company.id} value={`prospect:${company.id}`}>
                  {company.companyName} (prospect)
                </option>
              ))}
              {owner &&
                companies.movers.map((company) => (
                  <option key={company.id} value={`mover:${company.id}`}>
                    {company.companyName} (registered)
                  </option>
                ))}
            </select>
            {owner && (
              <label className="mt-3 block text-xs">
                Reviewed contact association (optional)
                <select
                  aria-label="Verified contact address"
                  className={`${input} mt-1`}
                  value={verifiedEmail}
                  onChange={(event) => setVerifiedEmail(event.target.value)}
                >
                  <option value="">Link this conversation only</option>
                  {conversation.participants
                    .filter((email) => email !== "support@matchnmove.co.nz")
                    .map((email) => (
                      <option value={email} key={email}>
                        {email}
                      </option>
                    ))}
                </select>
                <span className="mt-1 block text-slate-500">
                  Choose an address only after confirming it belongs to the
                  selected company. This does not grant marketing permission.
                </span>
              </label>
            )}
            <button
              className={`${secondary} mt-2`}
              disabled={!link || busy}
              onClick={() => {
                const [type, value] = link.split(":");
                void onAction("link", {
                  prospectId: type === "prospect" ? value : null,
                  moverCompanyId: type === "mover" ? value : null,
                  verifiedEmail: verifiedEmail || undefined,
                });
              }}
            >
              Link conversation
            </button>
            <Link
              className="ml-3 text-xs text-teal-700 underline"
              href="/admin/recruitment/prospects?new=1"
            >
              Create company record
            </Link>
          </details>
          {conversation.companyHistory &&
            conversation.companyHistory.length > 0 && (
              <details>
                <summary className="cursor-pointer text-xs font-semibold">
                  Other company conversations
                </summary>
                {conversation.companyHistory.map((item) => (
                  <button
                    key={item.id}
                    className="mt-2 block text-left text-xs text-teal-700 underline"
                    onClick={() => onOpen(item.id)}
                  >
                    {item.subject} · {label(item.status)} ·{" "}
                    {date(item.lastMessageAt)}
                  </button>
                ))}
              </details>
            )}
          {conversation.communicationHistory?.length ? (
            <details>
              <summary className="cursor-pointer text-xs font-semibold">
                Previous outreach history
              </summary>
              {conversation.communicationHistory.map((item) => (
                <Link
                  key={item.id}
                  className="mt-2 block text-xs text-teal-700 underline"
                  href={`/admin/recruitment/messages?id=${item.id}`}
                >
                  {item.subject} · {label(item.status)} · {date(item.sentAt)}
                </Link>
              ))}
            </details>
          ) : null}
        </div>
      </details>
      <div className="rounded-2xl border bg-white p-4">
        <h3 className="font-bold">Internal notes</h3>
        <p className="mt-1 text-xs text-slate-500">
          Only authorised admins can see these. They are never included in
          email.
        </p>
        {conversation.notes?.map((item) => (
          <div className="mt-3 rounded-xl bg-amber-50 p-3" key={item.id}>
            <p className="whitespace-pre-wrap text-sm">{item.text}</p>
            <p className="mt-2 text-xs text-slate-500">
              {item.author.name || item.author.email} · {date(item.createdAt)}
            </p>
          </div>
        ))}
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onAction("note", { text: note }).then((ok) => {
              if (ok) setNote("");
            });
          }}
        >
          <textarea
            required
            className={input}
            placeholder="Private team note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button className={secondary} disabled={busy}>
            Add internal note
          </button>
        </form>
      </div>
      <div className="rounded-2xl border bg-white p-4">
        <h3 className="font-bold">Follow-ups</h3>
        {conversation.tasks?.map((task) => (
          <div
            key={task.id}
            className="mt-3 flex justify-between gap-3 rounded-xl border p-3 text-sm"
          >
            <div>
              <strong>{task.title}</strong>
              <p className="mt-1 text-xs text-slate-500">
                {date(task.dueAt)} ·{" "}
                {task.completedAt
                  ? "Completed"
                  : task.cancelledAt
                    ? "Cancelled"
                    : new Date(task.dueAt) < new Date()
                      ? "Overdue"
                      : "Outstanding"}
              </p>
              {task.description && (
                <p className="mt-2 text-xs">{task.description}</p>
              )}
            </div>
            {!task.completedAt && !task.cancelledAt && (
              <button
                className={secondary}
                disabled={busy}
                onClick={() => void onAction("complete_task", { id: task.id })}
              >
                Complete
              </button>
            )}
          </div>
        ))}
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onAction("task", {
              title,
              dueAt: new Date(due).toISOString(),
              kind,
              priority,
              description,
              assignedAdminId: taskAssignee || undefined,
            }).then((ok) => {
              if (ok) {
                setTitle("");
                setDue("");
              }
            });
          }}
        >
          <input
            aria-label="Follow-up title"
            required
            className={input}
            placeholder="Next action"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            aria-label="Follow-up due date"
            type="datetime-local"
            required
            className={input}
            value={due}
            onChange={(event) => setDue(event.target.value)}
          />
          <select
            aria-label="Follow-up kind"
            className={input}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            {["FOLLOW_UP", "CALL", "RESEARCH", "REGISTRATION", "PRICING"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
          <select
            aria-label="Follow-up priority"
            className={input}
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option>LOW</option>
            <option>NORMAL</option>
            <option>HIGH</option>
          </select>
          {owner && (
            <label className="text-xs font-semibold">
              Follow-up and conversation owner
              <select
                aria-label="Follow-up and conversation owner"
                className={input}
                value={taskAssignee}
                onChange={(event) => setTaskAssignee(event.target.value)}
              >
                <option value="">Conversation assignee</option>
                {team.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name || person.email}
                  </option>
                ))}
              </select>
              <span className="mt-1 block font-normal text-slate-500">
                Choosing another colleague transfers this conversation and its
                outstanding follow-ups to them.
              </span>
            </label>
          )}
          <textarea
            aria-label="Follow-up internal notes"
            className={`${input} sm:col-span-2`}
            placeholder="Internal notes for this task"
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <button disabled={busy} className={secondary}>
            Create follow-up
          </button>
        </form>
      </div>
      <details className="rounded-2xl border bg-white p-4">
        <summary className="cursor-pointer font-semibold">
          Conversation activity
        </summary>
        {conversation.activities?.map((item) => (
          <p className="mt-2 text-xs text-slate-500" key={item.id}>
            {label(item.action)} · {date(item.createdAt)}
          </p>
        ))}
      </details>
    </div>
  );
}
