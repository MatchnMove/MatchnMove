"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import {
  CleanerAuthShell,
  CleanerFormNotice,
  cleanerInputClass,
  cleanerPrimaryButtonClass,
} from "@/components/cleaner-auth-shell";
import { useLanguage } from "@/components/language-provider";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/cleaner/dashboard";
  }
  return value;
}

export default function CleanerLoginPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ email: "", password: "" });
  const [code, setCode] = useState("");
  const [codeEmail, setCodeEmail] = useState("");
  const [nextPath, setNextPath] = useState("/cleaner/dashboard");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNextPath(safeNextPath(new URLSearchParams(window.location.search).get("next")));
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/cleaner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; email?: string; emailCodeRequired?: boolean };
      if (!response.ok) {
        setError(data.error || t("cleanerAuth.login.signInError"));
        return;
      }
      if (data.emailCodeRequired) {
        setCodeEmail(data.email || form.email);
        setCode("");
        return;
      }
      window.location.replace(nextPath);
    } catch {
      setError(t("cleanerAuth.common.serverError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/cleaner/login/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: codeEmail, code }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || t("cleanerAuth.login.codeError"));
        return;
      }
      window.location.replace(nextPath);
    } catch {
      setError(t("cleanerAuth.common.serverError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CleanerAuthShell
      eyebrow={codeEmail ? t("cleanerAuth.login.secureEyebrow") : t("cleanerAuth.login.welcomeEyebrow")}
      title={codeEmail ? t("cleanerAuth.login.checkEmailTitle") : t("cleanerAuth.login.title")}
      description={
        codeEmail
          ? t("cleanerAuth.login.codeDescription", { email: codeEmail })
          : t("cleanerAuth.login.description")
      }
    >
      {codeEmail ? (
        <form onSubmit={submitCode} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold text-slate-800">
            {t("cleanerAuth.login.codeLabel")}
            <span className="relative block">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${cleanerInputClass} pl-12 text-center text-xl font-black tracking-[0.35em]`}
                placeholder="000000"
              />
            </span>
          </label>
          <button disabled={submitting || code.length !== 6} className={cleanerPrimaryButtonClass}>
            {submitting ? t("cleanerAuth.login.checkingCode") : t("cleanerAuth.login.openDashboard")}
            {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
          <button
            type="button"
            onClick={() => {
              setCodeEmail("");
              setCode("");
              setError("");
            }}
            className="w-full text-center text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
          >
            {t("cleanerAuth.login.differentAccount")}
          </button>
        </form>
      ) : (
        <form onSubmit={submitLogin} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold text-slate-800">
            {t("cleanerAuth.login.email")}
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className={`${cleanerInputClass} pl-12`}
                placeholder="you@cleaningcompany.co.nz"
              />
            </span>
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            <span className="flex items-center justify-between gap-3">
              {t("cleanerAuth.login.password")}
              <Link href="/cleaner/forgot-password" className="text-xs font-bold text-sky-700 hover:text-sky-900">
                {t("cleanerAuth.login.forgotPassword")}
              </Link>
            </span>
            <span className="relative block">
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className={`${cleanerInputClass} pr-12`}
                placeholder={t("cleanerAuth.login.passwordPlaceholder")}
              />
              <button
                type="button"
                aria-label={showPassword ? t("cleanerAuth.login.hidePassword") : t("cleanerAuth.login.showPassword")}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </span>
          </label>
          <button disabled={submitting} className={cleanerPrimaryButtonClass}>
            {submitting ? t("cleanerAuth.login.signingIn") : t("cleanerAuth.login.continue")}
            {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </form>
      )}

      {error ? <CleanerFormNotice kind="error">{error}</CleanerFormNotice> : null}

      {!codeEmail ? (
        <div className="mt-7 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
          {t("cleanerAuth.login.newToMatch")} {" "}
          <Link href="/cleaner/register" className="font-bold text-sky-700 hover:text-sky-900">
            {t("cleanerAuth.login.createAccount")}
          </Link>
        </div>
      ) : null}
    </CleanerAuthShell>
  );
}
