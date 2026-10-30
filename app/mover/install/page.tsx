import type { Metadata } from "next";
import Link from "next/link";
import { MoverAppHeader } from "@/components/mover-app-header";
import { MoverInstallPanel } from "@/components/mover-install-panel";

export const metadata: Metadata = { title: "Install your mover app | Match 'n Move", robots: { index: false, follow: false } };
export default function MoverInstallPage() {
  return <div className="min-h-screen bg-slate-100"><MoverAppHeader dedicated /><main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">For registered moving companies</p>
    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Install your mover app</h1>
    <p className="mb-6 mt-3 text-sm leading-7 text-slate-600">Your leads, profile and notifications in a dedicated app window. Choose your phone below and follow the steps. You do not need a new account.</p>
    <MoverInstallPanel />
    <Link href="/mover/app" className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800">Open mover login</Link>
  </main></div>;
}
