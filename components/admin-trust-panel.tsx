"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
type Data = {
  content: {
    operatorName: string;
    registrationNumber: string;
    introduction: string;
    team: string;
  };
  movers: {
    id: string;
    companyName: string;
    legacyPublicProfile: boolean;
    profileReviewedAt: string | null;
    yearsOperating: number | null;
    yearsOperatingVerifiedAt: string | null;
    completeness: { missing: string[]; percent: number };
  }[];
  cleaners: {
    id: string;
    companyName: string;
    status: string;
    missing: string[];
  }[];
  reviews: {
    id: string;
    writtenReview: string | null;
    overallRating: number;
    moderationStatus: string;
    providerResponse: string | null;
    responseApprovedAt: string | null;
    moverCompany: { companyName: string };
  }[];
  reports: {
    id: string;
    reviewId: string;
    reason: string;
    review: {
      writtenReview: string | null;
      moderationStatus: string;
      moverCompany: { companyName: string };
    };
  }[];
  support: {
    id: string;
    quoteRequestId: string;
    message: string;
    createdAt: string;
  }[];
  contacts: {
    id: string;
    name: string;
    email: string;
    message: string;
    createdAt: string;
  }[];
  metrics: {
    days: number;
    quotes: number;
    cleaning: number;
    cleaningAttachment: number | null;
    events: { name: string; _count: { _all: number } }[];
    registrations: { role: string; _count: { _all: number } }[];
  };
};
const input = "mt-2 w-full rounded-xl border border-slate-300 p-3";
export function AdminTrustPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<Data["reviews"]>([]);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/trust", { cache: "no-store" });
      if (!r.ok) throw Error();
      setData(await r.json());
    } catch {
      setError("Owner data could not be loaded.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const response = await r.json();
      if (!r.ok) throw Error(response.error);
      await load();
      setLookup([]);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }
  if (!data) return <p role="status">{error || "Loading owner controls..."}</p>;
  return (
    <div className="mt-8 space-y-10">
      <p role="status" className="text-sm text-red-700">
        {error}
      </p>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-bold">
          Last 30 days &middot; recorded activity
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            ["Submitted moving requests", data.metrics.quotes],
            ["Attached cleaning requests", data.metrics.cleaning],
            [
              "Cleaning attachment rate",
              data.metrics.cleaningAttachment === null
                ? "No requests"
                : data.metrics.cleaningAttachment + "%",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-600">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Submission and attachment counts come from actual records. The event
          signals below are browser events, not unique people or confirmed
          bookings; do not treat their ratios as visitor conversion rates.
          Opt-outs, blocked requests and repeats can affect them.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {data.metrics.events.map((e) => (
            <p key={e.name} className="text-sm">
              {e.name.replaceAll("_", " ")}: <strong>{e._count._all}</strong>
            </p>
          ))}
        </div>
        <p className="mt-4 text-sm">
          New account records:{" "}
          {data.metrics.registrations
            .map((r) => r.role.toLowerCase() + " " + r._count._all)
            .join(" \u00b7 ") || "None"}
          . Account creation is not provider activation.
        </p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-bold">Verified business introduction</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Publish only business and team information you have verified. Empty
          fields stay hidden on the About page.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save({ action: "content", content: data.content });
          }}
        >
          {(
            [
              "operatorName",
              "registrationNumber",
              "introduction",
              "team",
            ] as const
          ).map((key) => (
            <label key={key} className="block text-sm font-semibold">
              {
                {
                  operatorName: "Operator / legal business name",
                  registrationNumber: "Registration / NZBN (optional)",
                  introduction: "Business introduction",
                  team: "Verified team information (optional)",
                }[key]
              }
              <textarea
                className={input}
                maxLength={
                  key === "operatorName"
                    ? 160
                    : key === "registrationNumber"
                      ? 40
                      : 1600
                }
                value={data.content[key]}
                onChange={(e) =>
                  setData({
                    ...data,
                    content: { ...data.content, [key]: e.target.value },
                  })
                }
              />
            </label>
          ))}
          <button
            disabled={busy}
            className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white"
          >
            Save public information
          </button>
        </form>
      </section>
      <section>
        <h2 className="text-2xl font-bold">Mover profile review</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Existing public eligibility is retained by the migration. Flagged
          records are not silently unpublished. New profiles need location,
          service categories, coverage, contact and an 80-character description,
          alongside existing verification checks.
        </p>
        <label className="mt-4 block text-sm font-semibold">
          Review / evidence note (required for profile, review and response
          decisions)
          <textarea
            className={input}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Record the checks performed and evidence consulted. Do not enter secrets."
          />
        </label>
        <div className="mt-5 space-y-3">
          {data.movers
            .filter(
              (m) =>
                m.completeness.missing.length > 0 ||
                !m.profileReviewedAt ||
                m.yearsOperating !== null,
            )
            .map((m) => (
              <div
                className="rounded-xl border border-slate-200 bg-white p-5"
                key={m.id}
              >
                <h3 className="font-bold">{m.companyName}</h3>
                <p className="mt-2 text-sm">
                  {m.completeness.percent}% &middot;{" "}
                  {m.completeness.missing.join(", ") ||
                    "Required information complete"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {m.legacyPublicProfile
                    ? "Existing record retained for review"
                    : "New profile completeness rule applies"}
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  <button
                    disabled={busy || note.trim().length < 10}
                    onClick={() =>
                      void save({ action: "profile", id: m.id, note })
                    }
                    className="min-h-11 text-sm font-semibold text-teal-700 underline"
                  >
                    Record profile review
                  </button>
                  {m.yearsOperating !== null && (
                    <button
                      disabled={busy || note.trim().length < 10}
                      onClick={() =>
                        void save({
                          action: "profile",
                          id: m.id,
                          note,
                          verifyYears: !m.yearsOperatingVerifiedAt,
                        })
                      }
                      className="min-h-11 text-sm font-semibold text-teal-700 underline"
                    >
                      {m.yearsOperatingVerifiedAt
                        ? "Remove operating-history check"
                        : "Confirm operating-history evidence"}
                    </button>
                  )}
                  <Link
                    href="/admin/verification"
                    className="min-h-11 py-3 text-sm underline"
                  >
                    Identity &amp; document controls
                  </Link>
                </div>
              </div>
            ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-bold">Cleaner completeness</h2>
        <div className="mt-4 space-y-3">
          {data.cleaners
            .filter((c) => c.missing.length > 0)
            .map((c) => (
              <p
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
              >
                <strong>{c.companyName}</strong> ? {c.status}
                <br />
                {c.missing.join(", ")}
              </p>
            ))}
        </div>
        <Link
          href="/admin/cleaners"
          className="mt-3 inline-block py-3 text-teal-700 underline"
        >
          Review cleaner activation &amp; billing
        </Link>
      </section>
      <section>
        <h2 className="text-2xl font-bold">
          Review moderation &amp; provider responses
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Decisions require the review note above and append to the audit log.
          Only approved, public reviews contribute to ratings.
        </p>
        <div className="mt-4 flex gap-3">
          <input
            className={input}
            aria-label="Review ID from a report"
            placeholder="Review ID from a report"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="shrink-0 px-3 text-sm underline"
            onClick={async () => {
              const r = await fetch(
                "/api/admin/trust/review?id=" + encodeURIComponent(query),
              );
              if (r.ok) setLookup([await r.json()]);
              else setError("Review not found or access denied.");
            }}
          >
            Find review
          </button>
        </div>
        {[
          ...data.reviews,
          ...lookup.filter((l) => !data.reviews.some((r) => r.id === l.id)),
        ].map((r) => (
          <article
            key={r.id}
            className="mt-4 rounded-xl border border-slate-200 bg-white p-5"
          >
            <h3 className="font-bold">
              {r.moverCompany.companyName} ? {r.overallRating}/5 &middot;{" "}
              {r.moderationStatus}
            </h3>
            <p className="mt-3 whitespace-pre-line text-sm">
              {r.writtenReview || "No written review"}
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              {["APPROVED", "PENDING", "REJECTED"].map((status) => (
                <button
                  key={status}
                  disabled={busy || note.trim().length < 10}
                  onClick={() =>
                    void save({ action: "review", id: r.id, status, note })
                  }
                  className="min-h-11 text-sm text-teal-700 underline"
                >
                  {status.toLowerCase()}
                </button>
              ))}
            </div>
            {r.providerResponse && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="whitespace-pre-line text-sm">
                  {r.providerResponse}
                </p>
                <div className="mt-3 flex gap-5">
                  {[true, false].map((approve) => (
                    <button
                      key={String(approve)}
                      disabled={busy || note.trim().length < 10}
                      className="min-h-11 text-sm text-teal-700 underline"
                      onClick={() =>
                        void save({
                          action: "response",
                          id: r.id,
                          approve,
                          note,
                        })
                      }
                    >
                      {approve ? "Approve response" : "Reject response"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
      <section>
        <h2 className="text-2xl font-bold">Reported reviews</h2>
        {data.reports.length === 0 && (
          <p className="mt-3 text-slate-600">No open reports.</p>
        )}
        {data.reports.map((r) => (
          <article
            key={r.id}
            className="mt-4 rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="font-semibold">
              {r.review.moverCompany.companyName} ? {r.review.moderationStatus}
            </p>
            <p className="mt-3 whitespace-pre-line text-sm">{r.reason}</p>
            <p className="mt-3 break-all text-xs">Review ID: {r.reviewId}</p>
            <button
              disabled={busy}
              className="mt-3 min-h-11 text-sm text-teal-700 underline"
              onClick={() => {
                setQuery(r.reviewId);
              }}
            >
              Use ID in moderation search
            </button>
            <button
              disabled={busy}
              className="ml-5 mt-3 min-h-11 text-sm text-teal-700 underline"
              onClick={() => void save({ action: "report", id: r.id })}
            >
              Mark report reviewed
            </button>
          </article>
        ))}
      </section>
      <section>
        <h2 className="text-2xl font-bold">
          Customer correction &amp; cleaning enquiry problems
        </h2>
        {data.support.length === 0 && (
          <p className="mt-3 text-slate-600">No open correction requests.</p>
        )}
        {data.support.map((r) => (
          <article
            key={r.id}
            className="mt-4 rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="break-all text-sm font-semibold">
              MN-{r.quoteRequestId.toUpperCase()}
            </p>
            <p className="mt-3 whitespace-pre-line text-sm">{r.message}</p>
            <Link
              href="/admin/quote-flow"
              className="mt-3 inline-block min-h-11 py-3 text-sm text-teal-700 underline"
            >
              Review original request
            </Link>
            <button
              disabled={busy}
              className="ml-5 min-h-11 text-sm text-teal-700 underline"
              onClick={() => void save({ action: "support", id: r.id })}
            >
              Mark reviewed / resolved
            </button>
          </article>
        ))}
      </section>
      <section>
        <h2 className="text-2xl font-bold">Recent contact enquiries</h2>
        {data.contacts.map((c) => (
          <article
            className="mt-4 rounded-xl border border-slate-200 bg-white p-5"
            key={c.id}
          >
            <p className="font-semibold">
              {c.name} &middot;{" "}
              <a href={"mailto:" + c.email} className="text-teal-700 underline">
                {c.email}
              </a>
            </p>
            <p className="mt-3 whitespace-pre-line text-sm">{c.message}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
