"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, FileSpreadsheet, RefreshCw, ShieldCheck, Unplug } from "lucide-react";

type Diagnostics = {
  configured: boolean;
  connected: boolean;
  account: {
    displayName: string;
    email: string;
    connectedAt: string;
  } | null;
  workbook: {
    path: string;
    tableName: string;
    webUrl: string | null;
    ownerEmail: string;
    editorEmails: string[];
    viewerEmails: string[];
  };
  queue: {
    counts: Record<string, number>;
    recentDeliveries: Array<{
      id: string;
      quoteRequestId: string;
      status: string;
      attempts: number;
      maxAttempts: number;
      nextAttemptAt: string;
      syncedAt: string | null;
      lastError: string | null;
      createdAt: string;
    }>;
  };
};

const actionLabels: Record<string, string> = {
  provision: "Creating and sharing workbook...",
  process: "Syncing queued leads...",
  retry: "Resetting and retrying deliveries...",
  disconnect: "Disconnecting Microsoft account...",
};

function StatusBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
      active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
    }`}>
      {children}
    </span>
  );
}

export function LeadSpreadsheetAdminPanel() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/lead-spreadsheet", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || "Could not load spreadsheet status.");
    setDiagnostics(body);
  }, []);

  useEffect(() => {
    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load status."));
  }, [load]);

  const runAction = async (action: string) => {
    setBusy(action);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/lead-spreadsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "The spreadsheet action failed.");
      setDiagnostics(body.diagnostics);
      setMessage(
        action === "provision"
          ? "Workbook verified, named team access applied, and the automatic feed is ready."
          : action === "disconnect"
            ? "Microsoft account disconnected. Queued leads remain safely stored in the database."
            : "Spreadsheet delivery queue processed.",
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The spreadsheet action failed.");
    } finally {
      setBusy("");
    }
  };

  if (!diagnostics) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading secure workbook status...</div>;
  }

  const counts = diagnostics.queue.counts;
  const workbookReady = Boolean(diagnostics.workbook.webUrl);

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${
          error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}>
          {error || message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <ShieldCheck className="h-6 w-6 text-teal-700" />
            <StatusBadge active={diagnostics.configured}>{diagnostics.configured ? "Configured" : "Needs variables"}</StatusBadge>
          </div>
          <h2 className="mt-4 font-bold text-slate-950">Microsoft application</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Tenant-restricted OAuth with encrypted refresh-token storage.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <CheckCircle2 className="h-6 w-6 text-teal-700" />
            <StatusBadge active={diagnostics.connected}>{diagnostics.connected ? "Connected" : "Not connected"}</StatusBadge>
          </div>
          <h2 className="mt-4 font-bold text-slate-950">Dedicated account</h2>
          <p className="mt-2 break-words text-sm leading-6 text-slate-600">
            {diagnostics.account
              ? `${diagnostics.account.displayName} (${diagnostics.account.email})`
              : diagnostics.workbook.ownerEmail
                ? `Expected owner: ${diagnostics.workbook.ownerEmail}`
                : "Configure the dedicated workbook owner email."}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <FileSpreadsheet className="h-6 w-6 text-teal-700" />
            <StatusBadge active={workbookReady}>{workbookReady ? "Workbook ready" : "Not provisioned"}</StatusBadge>
          </div>
          <h2 className="mt-4 font-bold text-slate-950">{diagnostics.workbook.path}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Structured table: {diagnostics.workbook.tableName}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Setup and recovery</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Only named users listed in Railway receive workbook access. Invitations require sign-in and grant edit access so the communications team can update dispatch fields.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {diagnostics.workbook.editorEmails.length > 0
                ? diagnostics.workbook.editorEmails.map((email) => (
                    <span key={email} className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">Editor: {email}</span>
                  ))
                : <span className="text-sm font-semibold text-amber-700">No LEADS_EXCEL_EDITOR_EMAILS are configured.</span>}
              {diagnostics.workbook.viewerEmails.map((email) => (
                <span key={email} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">View only: {email}</span>
              ))}
            </div>
          </div>
          <div className="flex min-w-fit flex-col gap-2 sm:flex-row lg:flex-col">
            {!diagnostics.connected && (
              <a
                href="/api/admin/lead-spreadsheet/oauth/connect"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0f6cbd] px-4 text-sm font-bold text-white hover:bg-[#0b5ca5]"
              >
                Connect Microsoft 365
              </a>
            )}
            <button
              type="button"
              disabled={!diagnostics.connected || Boolean(busy)}
              onClick={() => runAction("provision")}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create or verify workbook
            </button>
            {diagnostics.workbook.webUrl && (
              <a
                href={diagnostics.workbook.webUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Open workbook <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        {busy && <p className="mt-4 text-sm font-semibold text-teal-700">{actionLabels[busy]}</p>}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">Delivery queue</h2>
            <p className="mt-2 text-sm text-slate-600">Customer details are never shown in these diagnostics.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!workbookReady || Boolean(busy)}
              onClick={() => runAction("process")}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> Sync now
            </button>
            <button
              type="button"
              disabled={!workbookReady || Boolean(busy)}
              onClick={() => runAction("retry")}
              className="inline-flex min-h-10 items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              Retry failed
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["QUEUED", "SENDING", "SYNCED", "FAILED"].map((status) => (
            <div key={status} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold tracking-[0.12em] text-slate-500">{status}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{counts[status] ?? 0}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.1em] text-slate-500">
              <tr>
                <th className="px-3 py-3">Quote ID</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Attempts</th>
                <th className="px-3 py-3">Last error</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.queue.recentDeliveries.map((delivery) => (
                <tr key={delivery.id} className="border-b border-slate-100 align-top">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-700">{delivery.quoteRequestId}</td>
                  <td className="px-3 py-3 font-bold text-slate-700">{delivery.status}</td>
                  <td className="px-3 py-3 text-slate-600">{delivery.attempts}/{delivery.maxAttempts}</td>
                  <td className="max-w-lg px-3 py-3 text-slate-600">{delivery.lastError || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {diagnostics.connected && (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="font-bold text-rose-950">Disconnect integration</h2>
          <p className="mt-2 text-sm leading-6 text-rose-800">This removes the encrypted Microsoft refresh token. New leads remain queued in Postgres until another account is connected.</p>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => {
              if (window.confirm("Disconnect Microsoft 365? Automatic spreadsheet updates will pause.")) void runAction("disconnect");
            }}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-sm font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
          >
            <Unplug className="h-4 w-4" /> Disconnect
          </button>
        </section>
      )}
    </div>
  );
}
