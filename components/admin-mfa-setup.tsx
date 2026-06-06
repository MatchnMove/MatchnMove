"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";

type SetupState = {
  enabled: boolean;
  qrDataUrl: string | null;
  manualKey: string | null;
};

export function AdminMfaSetup() {
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/mfa/setup", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as SetupState & { error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load MFA setup.");
        setSetup(data);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load MFA setup."));
  }, []);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Could not verify that code.");
        return;
      }
      window.location.assign("/admin/verification");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto max-w-xl rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-[8px] bg-emerald-100 p-3 text-emerald-700"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Admin security</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Authenticator verification</h1>
          </div>
        </div>

        {!setup && !error ? <div className="mt-8 flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" />Loading secure setup...</div> : null}
        {setup && !setup.enabled ? (
          <div className="mt-6">
            <p className="text-sm leading-6 text-slate-600">Scan this code in Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app.</p>
            {setup.qrDataUrl ? <Image src={setup.qrDataUrl} alt="Admin authenticator QR code" width={280} height={280} unoptimized className="mx-auto mt-5 h-[280px] w-[280px]" /> : null}
            {setup.manualKey ? <p className="mt-4 break-all rounded-[8px] bg-slate-100 p-3 font-mono text-xs text-slate-700">Manual key: {setup.manualKey}</p> : null}
          </div>
        ) : null}
        {setup?.enabled ? <p className="mt-6 text-sm leading-6 text-slate-600">Enter the current code from your authenticator app to continue to verification reviews.</p> : null}

        {setup ? (
          <div className="mt-5 flex gap-2">
            <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit code" className="min-h-[48px] flex-1 rounded-[8px] border border-slate-300 px-4 text-base outline-none focus:border-emerald-600" />
            <button type="button" onClick={() => void verify()} disabled={busy || code.length !== 6} className="min-h-[48px] rounded-[8px] bg-emerald-700 px-5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Checking..." : "Continue"}
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-4 rounded-[8px] border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      </section>
    </main>
  );
}
