"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, MailCheck, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { PartnerAccountSwitcher, type PartnerAccessMode } from "@/components/partner-account-switcher";
import { useLanguage } from "@/components/language-provider";
import { Nav } from "@/components/site-shell";
import { formatCleaningLeadPrice } from "@/lib/cleaner-lead-pricing";

const benefitDefinitions = [
  {
    icon: MailCheck,
    titleKey: "cleanerAuth.benefit.leadsTitle",
    copyKey: "cleanerAuth.benefit.leadsCopy",
  },
  {
    icon: ShieldCheck,
    titleKey: "cleanerAuth.benefit.protectedTitle",
    copyKey: "cleanerAuth.benefit.protectedCopy",
  },
  {
    icon: ReceiptText,
    titleKey: "cleanerAuth.benefit.pricingTitle",
    copyKey: "cleanerAuth.benefit.pricingCopy",
  },
] as const;

export function CleanerAuthShell({
  eyebrow,
  title,
  description,
  accessMode = "login",
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accessMode?: PartnerAccessMode;
  children: ReactNode;
}) {
  const { locale, t } = useLanguage();
  const benefits = benefitDefinitions.map((benefit) => ({
    ...benefit,
    title: t(benefit.titleKey, { price: formatCleaningLeadPrice(locale) }),
    copy: t(benefit.copyKey),
  }));
  return (
    <>
      <Nav />
      <main className="relative min-h-[calc(100svh-4.5rem)] overflow-hidden bg-[linear-gradient(155deg,#eef5ff_0%,#f5f8fc_45%,#fff8f1_100%)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-14 h-80 w-80 rounded-full bg-sky-200/45 blur-3xl" />
          <div className="absolute -right-28 top-36 h-96 w-96 rounded-full bg-sky-200/45 blur-3xl" />
          <div className="absolute bottom-[-10rem] left-[38%] h-80 w-80 rounded-full bg-orange-100/70 blur-3xl" />
        </div>

        <div className="container-shell relative grid gap-8 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(32rem,1.1fr)] lg:items-start lg:gap-12 lg:py-14">
          <section className="max-w-xl pt-2 lg:sticky lg:top-8 lg:pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-800 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                {t("cleanerAuth.portal")}
              </p>
              <LanguageSelector compact className="lg:hidden" />
            </div>
            <h1 className="mt-5 max-w-[12ch] text-[clamp(2.8rem,7vw,5.3rem)] font-black leading-[0.93] tracking-[-0.055em] text-slate-950">
              {t("cleanerAuth.heroTitle")}
            </h1>
            <p className="mt-5 max-w-[34rem] text-base leading-7 text-slate-600 sm:text-lg">
              {t("cleanerAuth.heroCopy")}
            </p>

            <div className="mt-7 hidden space-y-3 sm:block">
              {benefits.map(({ icon: Icon, title: benefitTitle, copy }) => (
                <div key={benefitTitle} className="flex gap-4 rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.45)] backdrop-blur">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-950">{benefitTitle}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-[30px] border border-white/80 bg-white/80 p-2 shadow-[0_35px_90px_-42px_rgba(15,23,42,0.5)] backdrop-blur sm:p-4">
            <div className="rounded-[26px] border border-slate-200/80 bg-white p-5 sm:p-8 lg:p-10">
              <PartnerAccountSwitcher active="cleaner" mode={accessMode} className="mb-7" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">{eyebrow}</p>
                  <h2 className="mt-2 text-[clamp(2rem,6vw,3rem)] font-black tracking-[-0.04em] text-slate-950">{title}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
                </div>
                <LanguageSelector compact className="hidden shrink-0 lg:inline-flex" />
              </div>
              {children}
            </div>
          </section>
        </div>

        <div className="container-shell relative pb-8 text-center text-xs leading-5 text-slate-500">
          <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-sky-700" /> {t("cleanerAuth.secureAccess")}</span>
          <span aria-hidden="true" className="mx-2">&middot;</span>
          <Link href="/terms" className="underline underline-offset-2 hover:text-slate-800">{t("cleanerAuth.terms")}</Link>
          <span aria-hidden="true" className="mx-2">&middot;</span>
          <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-800">{t("cleanerAuth.privacy")}</Link>
        </div>
      </main>
    </>
  );
}

export const cleanerInputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brandBlue focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-500";

export const cleanerPrimaryButtonClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accentOrange px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_-18px_rgba(222,122,58,0.75)] transition hover:-translate-y-0.5 hover:bg-[#d46f30] disabled:pointer-events-none disabled:opacity-60";

export function CleanerFormNotice({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-sky-200 bg-sky-50 text-sky-800",
  } as const;

  return <p role={kind === "error" ? "alert" : "status"} className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${styles[kind]}`}>{children}</p>;
}
