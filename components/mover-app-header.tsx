"use client";
import Link from "next/link";
import { Nav } from "@/components/site-shell";
import { useMoverApp } from "@/components/mover-app-provider";

export function MoverAppHeader({ dedicated = false }: { dedicated?: boolean }) {
  const { installed } = useMoverApp();
  if (!dedicated && !installed) return <Nav />;
  return <header className="border-b border-slate-200 bg-white px-4 py-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
      <Link href="/app" className="text-lg font-black tracking-tight text-slate-950">Match <span className="text-teal-700">&apos;n</span> Move<span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Business app</span></Link>
      <Link href="/install" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">Install &amp; help</Link>
    </div>
  </header>;
}
