"use client";

import { useRef, useState } from "react";
import { manualStatuses, stoppedStatuses } from "@/lib/recruitment-stages";

const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());

export function CompanyStageSelect({ id, companyName, status, version, onSaved }: {
  id: string;
  companyName: string;
  status: string;
  version: number;
  onSaved: () => Promise<void>;
}) {
  const saving = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const closed = stoppedStatuses.includes(status);
  const choices = closed
    ? [...new Set([status, "DO_NOT_CONTACT"])]
    : [...new Set([status, ...manualStatuses])];

  async function change(next: string) {
    if (saving.current || next === status || !manualStatuses.some(value => value === next)) return;
    if ((next === "DO_NOT_CONTACT" || next === "NOT_INTERESTED") && !window.confirm(
      next === "DO_NOT_CONTACT"
        ? `Mark ${companyName} as Do not contact? This blocks future recruitment emails and cancels follow-ups.`
        : `Mark ${companyName} as Not interested? This closes recruitment and cancels follow-ups. This stage cannot be manually reopened.`,
    )) return;
    saving.current = true;
    setPending(next);
    setError("");
    try {
      const response = await fetch("/api/admin/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", data: { id, version, status: next } }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok === false) {
        if (response.status === 409) await onSaved();
        throw new Error(result?.error || "Could not update this company. Try again.");
      }
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this company. Try again.");
    } finally {
      saving.current = false;
      setPending(null);
    }
  }

  return <div className="min-w-44 max-w-64 space-y-1.5">
    <select
      aria-label={`Change stage for ${companyName}`}
      aria-busy={pending !== null}
      disabled={pending !== null || status === "DO_NOT_CONTACT"}
      value={pending ?? status}
      onChange={event => void change(event.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {choices.map(value => <option key={value} value={value} disabled={!manualStatuses.some(stage => stage === value)}>{label(value)}</option>)}
    </select>
    {pending && <p role="status" className="text-xs text-teal-700">Saving…</p>}
    {error && <p role="alert" className="text-xs leading-5 text-rose-700">{error}</p>}
    {status === "DO_NOT_CONTACT" && <p className="text-xs text-slate-500">Recruitment blocked</p>}
  </div>;
}
