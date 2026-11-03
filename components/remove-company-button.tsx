"use client";

import { useState } from "react";

export function RemoveCompanyButton({ company, onRemoved }: { company: { id: string; companyName: string; version: number; removedAt?: string | null }; onRemoved: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (!company.removedAt && !window.confirm(`Remove ${company.companyName} from the company directory? Pending invitations and follow-ups will stop. Sent emails and contact history will be retained.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/recruitment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: company.removedAt ? "restore_company" : "remove_company", data: { id: company.id, version: company.version, confirmed: true } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove this company.");
      await onRemoved();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not remove this company."); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={() => void remove()} className={`rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${company.removedAt ? "border-teal-200 text-teal-700 hover:bg-teal-50" : "border-rose-200 text-rose-700 hover:bg-rose-50"}`}>{busy ? "Saving…" : company.removedAt ? "Restore company to directory" : "Remove company from directory"}</button>{error && <p role="alert" className="mt-2 max-w-xs text-xs text-rose-700">{error}</p>}</div>;
}
