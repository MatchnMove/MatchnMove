"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, Info, LockKeyhole } from "lucide-react";
import {
  CleanerAuthShell,
  CleanerFormNotice,
  cleanerInputClass,
  cleanerPrimaryButtonClass,
} from "@/components/cleaner-auth-shell";
import { useLanguage } from "@/components/language-provider";
import { formatCleaningLeadPrice } from "@/lib/cleaner-lead-pricing";
import { NZ_SERVICE_AREA_GROUPS } from "@/lib/nz-regions";

const initialForm = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  serviceAreas: [] as string[],
  acceptedTerms: false,
};

export default function CleanerRegisterPage() {
  const { locale, t } = useLanguage();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordChecks = [
    [t("cleanerAuth.register.eightCharacters"), form.password.length >= 8],
    [t("cleanerAuth.register.uppercase"), /[A-Z]/.test(form.password)],
    [t("cleanerAuth.register.lowercase"), /[a-z]/.test(form.password)],
    [t("cleanerAuth.register.number"), /[0-9]/.test(form.password)],
  ] as const;

  function toggleArea(area: string) {
    setForm((current) => ({
      ...current,
      serviceAreas: current.serviceAreas.includes(area)
        ? current.serviceAreas.filter((item) => item !== area)
        : [...current.serviceAreas, area],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/cleaner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; verificationEmailSent?: boolean };
      if (!response.ok) {
        setError(data.error || t("cleanerAuth.register.accountError"));
        return;
      }
      setSuccess(
        data.verificationEmailSent
          ? "Your account is ready. Check your inbox to verify your email. We’re taking you to your dashboard now."
          : "Your account is ready and pending review. We’re taking you to your dashboard now.",
      );
      setSuccess(data.verificationEmailSent ? t("cleanerAuth.register.readyVerified") : t("cleanerAuth.register.readyReview"));
      window.setTimeout(() => window.location.replace("/cleaner/dashboard"), 700);
    } catch {
      setError(t("cleanerAuth.common.serverError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CleanerAuthShell
      eyebrow={t("cleanerAuth.register.eyebrow")}
      title={t("cleanerAuth.register.title")}
      description={t("cleanerAuth.register.description")}
      accessMode="signup"
    >
      <div className="mt-6 flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>{t("cleanerAuth.register.pricingStrong")}</strong> {t("cleanerAuth.register.pricingCopy", { price: formatCleaningLeadPrice(locale) })}</p>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800">
            {t("cleanerAuth.register.fullName")}
            <input required autoComplete="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={cleanerInputClass} placeholder="Aroha Williams" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            {t("cleanerAuth.register.company")}
            <input required autoComplete="organization" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} className={cleanerInputClass} placeholder="Aroha Cleaning Limited" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            {t("cleanerAuth.register.email")}
            <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={cleanerInputClass} placeholder="jobs@yourcompany.co.nz" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            {t("cleanerAuth.register.phone")}
            <input required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={cleanerInputClass} placeholder="021 234 5678" />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-bold text-slate-900">{t("cleanerAuth.register.regionsLegend")}</legend>
          <p className="mt-1 text-sm leading-6 text-slate-500">{t("cleanerAuth.register.regionsCopy")}</p>
          <div className="mt-4 space-y-4 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
            {NZ_SERVICE_AREA_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.regions.map((area) => {
                    const selected = form.serviceAreas.includes(area);
                    return (
                      <label key={area} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${selected ? "border-brandBlue bg-brandBlue text-white" : "border-slate-300 bg-white text-slate-700 hover:border-sky-300"}`}>
                        <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleArea(area)} />
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        {area}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p aria-live="polite" className="mt-2 text-xs font-medium text-slate-500">{form.serviceAreas.length} {form.serviceAreas.length === 1 ? t("cleanerAuth.register.regionSelected") : t("cleanerAuth.register.regionsSelected")}</p>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800">
            {t("cleanerAuth.register.password")}
            <span className="relative block">
              <input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className={`${cleanerInputClass} pr-12`} placeholder="Create a strong password" />
              <button type="button" aria-label={showPassword ? t("cleanerAuth.login.hidePassword") : t("cleanerAuth.login.showPassword")} onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </span>
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            {t("cleanerAuth.register.confirmPassword")}
            <input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={cleanerInputClass} placeholder="Repeat your password" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2" aria-label={t("cleanerAuth.register.passwordRequirements")}>
          {passwordChecks.map(([label, valid]) => (
            <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${valid ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
              <Check className="h-3 w-3" /> {label}
            </span>
          ))}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
          <input required type="checkbox" checked={form.acceptedTerms} onChange={(event) => setForm((current) => ({ ...current, acceptedTerms: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brandBlue focus:ring-brandBlue" />
          <span>
            {t("cleanerAuth.register.termsAgree")} <Link href="/terms" className="font-semibold text-sky-800 underline underline-offset-2">{t("cleanerAuth.terms").toLowerCase()}</Link> and <Link href="/privacy" className="font-semibold text-sky-800 underline underline-offset-2">{t("cleanerAuth.register.privacyPolicy")}</Link>, {t("cleanerAuth.register.fixedCharge", { price: formatCleaningLeadPrice(locale) })}
          </span>
        </label>

        <button disabled={submitting || form.serviceAreas.length === 0} className={cleanerPrimaryButtonClass}>
          {submitting ? t("cleanerAuth.register.creating") : t("cleanerAuth.register.create")}
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </form>

      {error ? <CleanerFormNotice kind="error">{error}</CleanerFormNotice> : null}
      {success ? <CleanerFormNotice kind="success">{success}</CleanerFormNotice> : null}

      <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-200 pt-6 text-sm text-slate-600">
        <LockKeyhole className="h-4 w-4 text-slate-400" />
        {t("cleanerAuth.register.alreadyRegistered")} <Link href="/cleaner/login" className="font-bold text-sky-700 hover:text-sky-900">{t("cleanerAuth.register.signIn")}</Link>
      </div>
    </CleanerAuthShell>
  );
}
