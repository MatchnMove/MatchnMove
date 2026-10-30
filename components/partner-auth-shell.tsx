"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSelector } from "@/components/language-selector";

export const partnerInputClass = "mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-700/15 disabled:bg-slate-50";
export const partnerButtonClass = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-sky-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait disabled:opacity-60";
export const partnerLinkClass = "font-medium text-sky-800 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

export function PartnerAuthShell({ children, appMode = false }: { children: ReactNode; appMode?: boolean }) {
  return <div className="relative isolate flex min-h-svh flex-col overflow-x-clip bg-[#f7f9fc] text-slate-900">
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top_right,rgba(186,230,253,0.45),transparent_65%)]" />
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 pb-4 pt-7 sm:px-8 sm:pt-10" style={{ paddingTop: "max(1.75rem, env(safe-area-inset-top))" }}>
      <Link href={appMode ? "/app" : "/"} aria-label={appMode ? "Match 'n Move business app" : "Match 'n Move home"} className="text-xl font-extrabold tracking-tight text-slate-950">match<span className="text-sky-700">&apos;n</span>move<span className="text-orange-500">.</span></Link>
      <LanguageSelector compact />
    </header>
    <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-4 pb-8 pt-6 sm:px-5 sm:pt-10">
      <section aria-label="Account access" className="rounded-xl border border-slate-200/80 bg-white px-6 py-7 shadow-[0_12px_35px_-20px_rgba(15,23,42,0.25)] sm:px-9 sm:py-9">{children}</section>
      <footer className="flex flex-wrap justify-center gap-x-5 gap-y-3 px-2 pb-2 pt-7 text-xs text-slate-500" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <Link href="/privacy" className="hover:text-slate-900 hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:text-slate-900 hover:underline">Terms</Link>
        <Link href="/install" className="hover:text-slate-900 hover:underline">Install & help</Link>
      </footer>
    </main>
  </div>;
}
