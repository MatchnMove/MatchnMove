"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowDownToLine, CheckCircle2 } from "lucide-react";
import { useMoverApp } from "@/components/mover-app-provider";
import { moverInstallGuides } from "@/lib/mover-install-guide";
import type { InstallPlatform } from "@/lib/mover-app-client";

export function MoverInstallPanel({ compact = false }: { compact?: boolean }) {
  const app = useMoverApp();
  const [guide, setGuide] = useState<InstallPlatform | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const guideRef = useRef<HTMLDivElement>(null);
  const selected = guide || app.platform;
  async function install() {
    setBusy(true);
    try {
      const result = await app.install();
      if (result === "accepted") setNotice("App added. Open the new icon on your Home Screen and log in.");
      else if (result === "dismissed") setNotice("You can install later. Your mover account is unchanged.");
      else { setGuide(app.platform); guideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }
    } catch { setGuide(app.platform); setNotice("Use your browser menu and follow the steps below."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="install-mover-heading" className={`rounded-2xl border border-slate-200 bg-white ${compact ? "p-5" : "p-5 sm:p-8"}`}>
    <h2 id="install-mover-heading" className="text-xl font-black text-slate-950">{app.installed ? "Your mover app is installed" : "Keep your mover dashboard one tap away"}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Use your existing account. The app opens your mover login or dashboard, with your leads, profile and alerts together.</p>
    <div className="mt-4 flex flex-wrap gap-3">{app.installed ? <span className="inline-flex min-h-11 items-center gap-2 font-semibold text-teal-800"><CheckCircle2 size={18} />Installed</span> : <button onClick={() => void install()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"><ArrowDownToLine size={18} />{busy ? "Opening…" : app.canPrompt ? "Install mover app" : "Show installation steps"}</button>}
      {compact && <Link href="/mover/install" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-teal-800 underline">Full installation guide</Link>}
    </div>
    {notice && <p role="status" className="mt-3 text-sm text-teal-800">{notice}</p>}
    {app.workerError && <p role="alert" className="mt-3 text-sm text-amber-900">{app.workerError} <button className="font-bold underline" onClick={app.retry}>Try again</button></p>}
    {(!compact || guide) && <div ref={guideRef} className="mt-6 scroll-mt-6">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" aria-label="Choose your device">{([['ios', 'iPhone / iPad'], ['android', 'Android'], ['desktop', 'Computer']] as const).map(([id, title]) => <button key={id} onClick={() => setGuide(id)} aria-pressed={selected === id} className={`min-h-11 rounded-lg px-2 text-xs font-bold sm:text-sm ${selected === id ? "bg-white text-teal-800 shadow-sm" : "text-slate-600"}`}>{title}</button>)}</div>
      <ol className="mt-5 space-y-5">{moverInstallGuides[selected].map((step, index) => <li key={step.title} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-bold text-teal-800">{index + 1}</span><div><h3 className="font-bold text-slate-900">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p></div></li>)}</ol>
      <div className="mt-6 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-950"><strong>Already have an older icon?</strong> If it opens the public homepage or a normal browser tab, remove that shortcut and install again from <Link className="font-bold underline" href="/mover/app">the mover app page</Link>. This does not delete your mover account or leads.</div>
      <p className="mt-4 text-sm leading-6 text-slate-600">You can use your dashboard in the browser while setting up installation. Internet access is required for leads. For help, email <a className="font-semibold text-teal-800 underline" href="mailto:support@matchnmove.co.nz">support@matchnmove.co.nz</a> with your phone model and browser.</p>
    </div>}
  </section>;
}
