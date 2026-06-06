"use client";

import { useState, type ReactNode } from "react";
import { Check, FileText, LoaderCircle, RefreshCw, ShieldCheck, X } from "lucide-react";
import { cx } from "@/lib/utils";

type NzbnReview = {
  id: string;
  companyName: string;
  nzbn: string | null;
  nzbnRegisteredName: string | null;
  nzbnEntityStatus: string | null;
  nzbnVerificationError: string | null;
  nzbnVerificationSource: string | null;
  updatedAt: string;
  userEmail: string;
};

type DocumentReview = {
  id: string;
  moverCompanyId: string;
  type: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  expiresAt: string | null;
  scanStatus: string;
  detectedMimeType: string | null;
  sha256: string | null;
  viewUrl: string;
  createdAt: string;
  moverCompany: {
    id: string;
    companyName: string;
    nzbn: string | null;
    nzbnVerificationStatus: string;
    userEmail: string;
  };
};

type Props = {
  initialNzbnReviews: NzbnReview[];
  initialDocumentReviews: DocumentReview[];
};

type QueueResponse = {
  nzbnReviews?: Array<Omit<NzbnReview, "userEmail"> & { user?: { email?: string } }>;
  documentReviews?: Array<Omit<DocumentReview, "moverCompany"> & {
    moverCompany: Omit<DocumentReview["moverCompany"], "userEmail"> & { user?: { email?: string } };
  }>;
  error?: string;
};

function formatFileSize(fileSize: number | null) {
  if (!fileSize) return "Unknown size";
  if (fileSize >= 1024 * 1024) return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(fileSize / 1024)} KB`;
}

function formatDocumentType(type: string) {
  return type.replaceAll("_", " ").toLowerCase();
}

export function AdminMoverVerificationPanel({ initialNzbnReviews, initialDocumentReviews }: Props) {
  const [nzbnReviews, setNzbnReviews] = useState(initialNzbnReviews);
  const [documentReviews, setDocumentReviews] = useState(initialDocumentReviews);
  const [nzbnNotes, setNzbnNotes] = useState<Record<string, string>>({});
  const [documentNotes, setDocumentNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshQueue() {
    setBusyId("refresh");
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/mover-verification", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as QueueResponse | null;

      if (!response.ok) {
        setError(data?.error ?? "Could not refresh the verification queue.");
        return;
      }

      setNzbnReviews(
        (data?.nzbnReviews ?? []).map((mover) => ({
          ...mover,
          userEmail: mover.user?.email ?? "",
        })),
      );
      setDocumentReviews(
        (data?.documentReviews ?? []).map((document) => ({
          ...document,
          moverCompany: {
            ...document.moverCompany,
            userEmail: document.moverCompany.user?.email ?? "",
          },
        })),
      );
      setMessage("Queue refreshed.");
    } finally {
      setBusyId(null);
    }
  }

  async function decideNzbn(mover: NzbnReview, status: "VERIFIED" | "FAILED" | "PENDING_REVIEW") {
    setBusyId(`nzbn:${mover.id}:${status}`);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/mover-verification/movers/${mover.id}/nzbn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          registeredName: mover.nzbnRegisteredName ?? mover.companyName,
          entityStatus: mover.nzbnEntityStatus ?? "REGISTERED",
          note: nzbnNotes[mover.id]?.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(data?.error ?? "Could not update NZBN review.");
        return;
      }

      if (status !== "PENDING_REVIEW") {
        setNzbnReviews((current) => current.filter((item) => item.id !== mover.id));
      }
      setMessage(status === "VERIFIED" ? "NZBN approved." : status === "FAILED" ? "NZBN rejected." : "NZBN left in review.");
    } finally {
      setBusyId(null);
    }
  }

  async function decideDocument(document: DocumentReview, status: "APPROVED" | "REJECTED" | "PENDING_REVIEW") {
    setBusyId(`document:${document.id}:${status}`);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/mover-verification/documents/${document.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note: documentNotes[document.id]?.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(data?.error ?? "Could not update document review.");
        return;
      }

      if (status !== "PENDING_REVIEW") {
        setDocumentReviews((current) => current.filter((item) => item.id !== document.id));
      }
      setMessage(status === "APPROVED" ? "Document approved." : status === "REJECTED" ? "Document rejected." : "Document left in review.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Pending NZBN" value={String(nzbnReviews.length)} />
        <SummaryTile label="Pending docs" value={String(documentReviews.length)} />
        <button
          type="button"
          onClick={refreshQueue}
          disabled={busyId === "refresh"}
          className="inline-flex min-h-[76px] items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-70"
        >
          {busyId === "refresh" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh queue
        </button>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Business identity</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950">NZBN review</h2>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {nzbnReviews.length ? (
              nzbnReviews.map((mover) => (
                <ReviewCard key={mover.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black tracking-[-0.04em] text-slate-950">{mover.companyName}</p>
                      <p className="mt-1 text-sm text-slate-500">{mover.userEmail}</p>
                    </div>
                    <StatusPill label={mover.nzbnVerificationSource ?? "Manual"} tone="amber" />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Detail label="NZBN" value={mover.nzbn ?? "Not supplied"} />
                    <Detail label="Register name" value={mover.nzbnRegisteredName ?? "Needs review"} />
                    <Detail label="Entity status" value={mover.nzbnEntityStatus ?? "Unknown"} />
                    <Detail label="Submitted" value={new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(new Date(mover.updatedAt))} />
                  </div>
                  {mover.nzbnVerificationError ? <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{mover.nzbnVerificationError}</p> : null}
                  <ReviewNote value={nzbnNotes[mover.id] ?? ""} onChange={(value) => setNzbnNotes((current) => ({ ...current, [mover.id]: value }))} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton label="Approve NZBN" tone="green" busy={busyId === `nzbn:${mover.id}:VERIFIED`} onClick={() => decideNzbn(mover, "VERIFIED")} icon={<Check className="h-4 w-4" />} />
                    <ActionButton label="Reject" tone="red" busy={busyId === `nzbn:${mover.id}:FAILED`} onClick={() => decideNzbn(mover, "FAILED")} icon={<X className="h-4 w-4" />} />
                  </div>
                </ReviewCard>
              ))
            ) : (
              <EmptyState text="No NZBN reviews waiting." />
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Evidence</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950">Document review</h2>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {documentReviews.length ? (
              documentReviews.map((document) => (
                <ReviewCard key={document.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black tracking-[-0.04em] text-slate-950">{document.fileName}</p>
                      <p className="mt-1 text-sm text-slate-500">{document.moverCompany.companyName} | {document.moverCompany.userEmail}</p>
                    </div>
                    <StatusPill label={formatDocumentType(document.type)} tone="slate" />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Detail label="NZBN" value={document.moverCompany.nzbn ?? "Not supplied"} />
                    <Detail label="File size" value={formatFileSize(document.fileSize)} />
                    <Detail label="Mime type" value={document.mimeType ?? "Unknown"} />
                    <Detail label="Detected type" value={document.detectedMimeType ?? "Not validated"} />
                    <Detail label="Malware scan" value={document.scanStatus.replaceAll("_", " ")} />
                    <Detail label="Expires" value={document.expiresAt ? new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(new Date(document.expiresAt)) : "Not supplied"} />
                    <Detail label="Uploaded" value={new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(new Date(document.createdAt))} />
                    <Detail label="SHA-256" value={document.sha256 ?? "Legacy upload"} />
                  </div>
                  <a href={document.viewUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    View submitted file
                  </a>
                  <ReviewNote value={documentNotes[document.id] ?? ""} onChange={(value) => setDocumentNotes((current) => ({ ...current, [document.id]: value }))} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton label="Approve document" tone="green" busy={busyId === `document:${document.id}:APPROVED`} onClick={() => decideDocument(document, "APPROVED")} icon={<Check className="h-4 w-4" />} />
                    <ActionButton label="Reject" tone="red" busy={busyId === `document:${document.id}:REJECTED`} onClick={() => decideDocument(document, "REJECTED")} icon={<X className="h-4 w-4" />} />
                  </div>
                </ReviewCard>
              ))
            ) : (
              <EmptyState text="No documents waiting." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{value}</p>
    </div>
  );
}

function ReviewCard({ children }: { children: ReactNode }) {
  return <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">{children}</div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "amber" | "slate" }) {
  return (
    <span className={cx("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700")}>
      {label}
    </span>
  );
}

function ReviewNote({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Review note (required for a decision)</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
        placeholder="Record the evidence checked or why this was rejected."
      />
    </label>
  );
}

function ActionButton({
  label,
  tone,
  busy,
  onClick,
  icon,
}: {
  label: string;
  tone: "green" | "red";
  busy: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cx(
        "inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:opacity-70",
        tone === "green" ? "bg-emerald-700 text-white hover:bg-emerald-800" : "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
      )}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
      <p className="font-semibold text-slate-600">{text}</p>
    </div>
  );
}
