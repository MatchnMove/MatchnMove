"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  CleanerAuthShell,
  CleanerFormNotice,
  cleanerInputClass,
  cleanerPrimaryButtonClass,
} from "@/components/cleaner-auth-shell";
import { useLanguage } from "@/components/language-provider";

function ResetForm() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/cleaner/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || t("cleanerAuth.reset.error"));
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setMessage(t("cleanerAuth.reset.success"));
    } catch {
      setError(t("cleanerAuth.common.serverError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-7">
        <CleanerFormNotice kind="error">{t("cleanerAuth.reset.missingToken")}</CleanerFormNotice>
        <Link href="/cleaner/forgot-password" className={`${cleanerPrimaryButtonClass} mt-5`}>{t("cleanerAuth.reset.requestLink")}</Link>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="block text-sm font-semibold text-slate-800">
          {t("cleanerAuth.reset.newPassword")}
          <span className="relative block">
            <input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${cleanerInputClass} pr-12`} placeholder="At least 8 characters" />
            <button type="button" aria-label={showPassword ? t("cleanerAuth.login.hidePassword") : t("cleanerAuth.login.showPassword")} onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </span>
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          {t("cleanerAuth.reset.confirmPassword")}
          <input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={cleanerInputClass} placeholder="Repeat your password" />
        </label>
        <p className="text-xs leading-5 text-slate-500">{t("cleanerAuth.reset.passwordHint")}</p>
        <button disabled={submitting} className={cleanerPrimaryButtonClass}>{submitting ? t("cleanerAuth.reset.updating") : t("cleanerAuth.reset.update")}</button>
      </form>
      {message ? (
        <div className="mt-5">
          <CleanerFormNotice kind="success"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{message}</span></CleanerFormNotice>
          <Link href="/cleaner/login" className={`${cleanerPrimaryButtonClass} mt-4`}>{t("cleanerAuth.reset.goLogin")}</Link>
        </div>
      ) : null}
      {error ? <CleanerFormNotice kind="error">{error}</CleanerFormNotice> : null}
    </>
  );
}

export default function CleanerResetPasswordPage() {
  const { t } = useLanguage();
  return (
    <CleanerAuthShell eyebrow={t("cleanerAuth.reset.eyebrow")} title={t("cleanerAuth.reset.title")} description={t("cleanerAuth.reset.description")}>
      <Suspense fallback={<p className="mt-7 text-sm text-slate-600">{t("cleanerAuth.reset.loading")}</p>}><ResetForm /></Suspense>
    </CleanerAuthShell>
  );
}
