"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function InboxUnreadBadge() {
  const [unread, setUnread] = useState(0);
  const [notice, setNotice] = useState("");
  const previous = useRef<{ unread: number; assignment: string | null } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch("/api/admin/inbox?view=badge", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          unread: number;
          assignments: Array<{ assignedAt: string }>;
        };
        if (!active) return;
        const assignment = data.assignments[0]?.assignedAt || null;
        if (
          previous.current &&
          assignment &&
          assignment !== previous.current.assignment
        )
          setNotice("A conversation has been assigned to you.");
        else if (previous.current && data.unread > previous.current.unread)
          setNotice("New unread email in the partner inbox.");
        previous.current = { unread: data.unread, assignment };
        setUnread(data.unread);
      } catch {
        /* A failed poll leaves the last count; it never grants access. */
      }
    };
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <>
      <span
        aria-label={`${unread} unread conversations`}
        className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-800"
      >
        {unread}
      </span>
      {notice && (
        <span
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-72 rounded-xl border border-teal-200 bg-white p-4 text-sm text-slate-900 shadow-lg"
        >
          {notice} Open inbox →
        </span>
      )}
    </>
  );
}

type Summary = {
  unread: number;
  waitingTeam: number;
  waitingPartner: number;
  due: number;
  overdue: number;
  resolved: number;
  mailbox: { connected: boolean };
  recent: Array<{ id: string; subject: string }>;
};
export function PartnerInboxSummary() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/inbox?view=summary", {
          cache: "no-store",
        });
        if (response.ok) {
          const result = await response.json();
          if (active) setData(result);
        }
      } catch {}
    };
    void load();
    const timer = setInterval(() => {
      void load();
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  if (!data) return null;
  return (
    <section
      aria-label="Partner inbox overview"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-bold">Partner inbox</h2>
        <Link
          href="/admin/inbox"
          className="text-sm font-semibold text-teal-700 underline"
        >
          Open inbox →
        </Link>
      </div>
      {!data.mailbox.connected && (
        <p className="text-sm text-slate-500">
          Connect the support mailbox in Inbox to start receiving email here.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          ["Unread", data.unread],
          ["Awaiting team", data.waitingTeam],
          ["Awaiting partner", data.waitingPartner],
          ["Follow-ups due today", data.due],
          ["Overdue follow-ups", data.overdue],
          ["Resolved this week", data.resolved],
        ].map(([name, value]) => (
          <div key={name} className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{name}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      {data.recent.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500">
            Recent conversations
          </p>
          {data.recent.map((item) => (
            <Link
              key={item.id}
              href={`/admin/inbox?conversation=${encodeURIComponent(item.id)}`}
              className="mt-2 block truncate text-sm text-teal-700 underline"
            >
              {item.subject}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
