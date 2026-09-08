"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CleanerAuthShell, cleanerPrimaryButtonClass } from "@/components/cleaner-auth-shell";
import { useLanguage } from "@/components/language-provider";

function VerifyEmail() {
  const { t } = useLanguage();
  const token = useSearchParams().get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [messageKey, setMessageKey] = useState(token ? "cleanerAuth.verify.verifying" : "cleanerAuth.verify.missingToken");
  const [serverMessage, setServerMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function verify() {
      try {
        const response = await fetch("/api/cleaner/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!active) return;
        if (!response.ok) {
          setStatus("error");
          setServerMessage(data.error || "");
          setMessageKey("cleanerAuth.verify.invalid");
          return;
        }
        setStatus("success");
        setServerMessage("");
        setMessageKey("cleanerAuth.verify.success");
      } catch {
        if (!active) return;
        setStatus("error");
        setServerMessage("");
        setMessageKey("cleanerAuth.verify.retry");
      }
    }
    void verify();
    return () => { active = false; };
  }, [token]);

  const Icon = status === "success" ? CheckCircle2 : status === "error" ? TriangleAlert : LoaderCircle;
  const colour = status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className="mt-7">
      <div role="status" className={`flex gap-3 rounded-2xl border p-4 text-sm leading-6 ${colour}`}>
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${status === "loading" ? "animate-spin" : ""}`} />
        <p>{serverMessage || t(messageKey)}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/cleaner/dashboard" className={cleanerPrimaryButtonClass}>{t("cleanerAuth.verify.dashboard")}</Link>
        <Link href="/cleaner/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">{t("cleanerAuth.verify.login")}</Link>
      </div>
    </div>
  );
}

export default function CleanerVerifyEmailPage() {
  const { t } = useLanguage();
  return (
    <CleanerAuthShell eyebrow={t("cleanerAuth.verify.eyebrow")} title={t("cleanerAuth.verify.title")} description={t("cleanerAuth.verify.description")}>
      <Suspense fallback={<p className="mt-7 text-sm text-slate-600">{t("cleanerAuth.verify.loading")}</p>}><VerifyEmail /></Suspense>
    </CleanerAuthShell>
  );
}
