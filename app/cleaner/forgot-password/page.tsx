"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import {
  CleanerAuthShell,
  CleanerFormNotice,
  cleanerInputClass,
  cleanerPrimaryButtonClass,
} from "@/components/cleaner-auth-shell";
import { useLanguage } from "@/components/language-provider";

export default function CleanerForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/cleaner/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error || t("cleanerAuth.forgot.error"));
        return;
      }
      setMessage(data.message || t("cleanerAuth.forgot.sent"));
    } catch {
      setError(t("cleanerAuth.common.serverError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CleanerAuthShell eyebrow="Account recovery" title="Reset your password" description="Enter the email for your cleaner account. If it matches an account, we’ll send a secure, time-limited reset link.">
      <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="block text-sm font-semibold text-slate-800">
          {t("cleanerAuth.forgot.email")}
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`${cleanerInputClass} pl-12`} placeholder="you@cleaningcompany.co.nz" />
          </span>
        </label>
        <button disabled={submitting} className={cleanerPrimaryButtonClass}>{submitting ? t("cleanerAuth.forgot.sending") : t("cleanerAuth.forgot.send")}</button>
      </form>
      {message ? <CleanerFormNotice kind="success">{message}</CleanerFormNotice> : null}
      {error ? <CleanerFormNotice kind="error">{error}</CleanerFormNotice> : null}
      <Link href="/cleaner/login" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-sky-900">
        <ArrowLeft className="h-4 w-4" /> {t("cleanerAuth.forgot.back")}
      </Link>
    </CleanerAuthShell>
  );
}
