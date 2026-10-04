"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, Bell, BellRing, Check, CheckCircle2, ChevronRight, LoaderCircle, Monitor, MoreHorizontal, Share, ShieldCheck, Smartphone, X } from "lucide-react";
import { applicationServerKey, disconnectMoverPushDevice, getInstallPlatform, registerMoverAppWorker, type InstallPlatform } from "@/lib/mover-app-client";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type PushSettings = { ready: boolean; publicKey: string | null; subscriptions: Array<{ id: string; endpoint: string }> };

const guides: Record<InstallPlatform, Array<{ title: string; text: string }>> = {
  ios: [
    { title: "Open this dashboard in Safari", text: "If you're inside an email or social app, open this page in Safari first." },
    { title: "Tap Share, then Add to Home Screen", text: "Share is the square with an upward arrow. If it's hidden, tap More (•••) first. Scroll through the actions to find Add to Home Screen." },
    { title: "Keep Open as Web App on, then tap Add", text: "If your iPhone shows that option, leave it switched on. The Match 'n Move icon will appear on your Home Screen." },
    { title: "Open the app and enable notifications", text: "Launch it from the new icon, sign in if asked, then tap Enable notifications and Allow. Requires iOS or iPadOS 16.4 or later." },
  ],
  android: [
    { title: "Open the dashboard in Chrome", text: "Use your phone's browser rather than the browser inside an email or social app." },
    { title: "Tap Install the mover app", text: "Confirm Install when your phone asks. You can also open Chrome's ⋮ menu and choose Add to Home screen or Install app." },
    { title: "Open your new app", text: "Find Match 'n Move on your Home Screen or in your apps. Sign in with your existing mover account." },
    { title: "Turn on phone alerts", text: "Tap Enable notifications, choose Allow, then send yourself a test notification." },
  ],
  desktop: [
    { title: "Install from your browser", text: "In Chrome or Edge, use Install the mover app or the install icon in the address bar. On a Mac with Safari, choose File → Add to Dock." },
    { title: "Keep your dashboard close", text: "Open Match 'n Move from your apps, Dock or taskbar. It opens directly to your mover dashboard." },
    { title: "Enable alerts on this device", text: "Choose Enable notifications, then Allow. To get alerts on your phone too, open this dashboard on your phone and repeat the setup there." },
  ],
};

export function MoverAppInstallCard({ accountId, isTestAccount }: { accountId: string; isTestAccount: boolean }) {
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [guide, setGuide] = useState<InstallPlatform>("desktop");
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [pushState, setPushState] = useState<"loading" | "off" | "on" | "unsupported" | "blocked">("loading");
  const [settings, setSettings] = useState<PushSettings | null>(null);
  const [busy, setBusy] = useState<"install" | "enable" | "disable" | "test" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;
    const media = window.matchMedia("(display-mode: standalone)");
    const readInstalled = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const beforeInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const afterInstall = () => { setInstalled(true); setInstallPrompt(null); setNotice("App installed. Enable notifications to get alerts on this device."); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", afterInstall);
    media.addEventListener("change", readInstalled);
    async function initialise() {
      await Promise.resolve();
      if (cancelled) return;
      const detected = getInstallPlatform(navigator.userAgent, navigator.maxTouchPoints);
      setPlatform(detected); setGuide(detected); readInstalled();
      if (!("serviceWorker" in navigator) || !window.isSecureContext) { setPushState("unsupported"); return; }
      try {
        const [registration, response] = await Promise.all([registerMoverAppWorker(), fetch("/api/mover/push", { cache: "no-store" })]);
        if (!response.ok) throw new Error("Notification settings couldn't load. Refresh the page to try again.");
        const config = await response.json() as PushSettings;
        if (cancelled) return;
        registrationRef.current = registration; setSettings(config);
        if (!("PushManager" in window) || !("Notification" in window)) { setPushState("unsupported"); return; }
        const subscription = await registration.pushManager.getSubscription();
        if (cancelled) return;
        const saved = subscription && config.subscriptions.some((item) => item.endpoint === subscription.endpoint);
        // A device may have switched accounts. Do not silently opt the new user
        // in, and stop the old browser subscription before it can show alerts.
        if (subscription && !saved) await subscription.unsubscribe();
        setPushState(Notification.permission === "denied" ? "blocked" : saved && Notification.permission === "granted" ? "on" : "off");
      } catch (cause) {
        if (!cancelled) { setPushState("off"); setError(cause instanceof Error ? cause.message : "Notification setup is unavailable. Please refresh."); }
      }
    }
    void initialise();
    return () => { cancelled = true; window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", afterInstall); media.removeEventListener("change", readInstalled); };
  }, [accountId]);

  function showGuide() { setGuide(platform); dialogRef.current?.showModal(); }

  async function install() {
    if (!installPrompt) { showGuide(); return; }
    setBusy("install"); setError(""); setNotice("");
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "dismissed") setNotice("No problem. You can install the app here whenever you're ready.");
      setInstallPrompt(null);
    } catch { showGuide(); }
    finally { setBusy(null); }
  }

  async function enable() {
    setError(""); setNotice("");
    if (platform === "ios" && !installed) { showGuide(); return; }
    if (!settings?.ready || !settings.publicKey || !registrationRef.current) { setError("Notification setup isn't ready. Refresh the page and try again."); return; }
    setBusy("enable");
    try {
      // Keep the permission request directly in the user's click gesture (iOS).
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "blocked" : "off");
        setNotice(permission === "denied" ? "Notifications are blocked. Allow them in your browser or phone settings, then return here." : "Notifications weren't enabled. You can try again when you're ready.");
        return;
      }
      const registration = registrationRef.current;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(settings.publicKey) });
      const response = await fetch("/api/mover/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
      const data = await response.json();
      if (!response.ok) { await subscription.unsubscribe(); throw new Error(data.error || "Couldn't enable notifications."); }
      setPushState("on"); setExpanded(true); setNotice("Notifications are on for this device. Send a test to check they're reaching you.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't enable notifications. Please try again."); }
    finally { setBusy(null); }
  }

  async function disable() {
    setBusy("disable"); setError(""); setNotice("");
    try { await disconnectMoverPushDevice(); setPushState("off"); setNotice("Notifications are off on this device. Your email alerts continue."); }
    catch { setError("Couldn't disconnect this device. Please try again."); }
    finally { setBusy(null); }
  }

  async function sendTest() {
    setBusy("test"); setError(""); setNotice("");
    try {
      const subscription = await registrationRef.current?.pushManager.getSubscription();
      if (!subscription) { setPushState("off"); throw new Error("Enable notifications on this device first."); }
      const response = await fetch("/api/mover/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", endpoint: subscription.endpoint }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Couldn't send the test.");
      setNotice(data.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't send the test."); }
    finally { setBusy(null); }
  }

  const iosNeedsInstall = platform === "ios" && !installed;
  const notificationDetail = iosNeedsInstall ? "Install first, then open the app from your Home Screen."
    : pushState === "on" ? "New quote alerts can reach this device, even when the app is closed."
    : pushState === "blocked" ? "Allow notifications in your device or browser settings, then refresh this page."
    : pushState === "unsupported" ? "Use a supported browser on your phone. On iPhone, open the installed Home Screen app."
    : settings && !settings.ready ? "Phone alerts are being set up. Email notifications continue as usual."
    : "Allow alerts so you know when a new quote matches your service area.";

  return (
    <section id="install-app" aria-labelledby="mover-app-heading" className="scroll-mt-5 overflow-hidden rounded-[26px] border border-slate-800 bg-[#0e1b30] text-white shadow-lg sm:rounded-[30px]">
      {installed && pushState === "on" ? <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-7"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-sm font-bold">Your mover app is ready</p><p className="mt-0.5 text-xs text-slate-300">Installed · Notifications on</p></div></div><button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="min-h-11 rounded-xl border border-white/20 px-3 text-xs font-bold hover:bg-white/10">{expanded ? "Close" : "Manage app"}</button></div> : null}
      <div className={installed && pushState === "on" && !expanded ? "hidden" : undefined}>
      <div className="relative flex items-center justify-between gap-5 px-5 pb-5 pt-6 sm:px-7 sm:pt-7">
        <div className="relative z-10 max-w-xl">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">
            <Smartphone className="h-4 w-4" /><span>Your mover app</span><span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] tracking-[0.12em] text-slate-300">Free to install</span>
          </div>
          <h2 id="mover-app-heading" className="mt-3 text-[27px] font-black leading-[1.08] tracking-[-0.045em] sm:text-[34px]">{installed ? "Your dashboard. Always close." : "Your next job. A tap away."}</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">Add Match &apos;n Move to your {platform === "desktop" ? "phone or computer" : "Home Screen"} and get a notification when a new quote arrives.</p>
          {isTestAccount ? <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-400/10 px-2.5 py-1 text-xs text-sky-200"><ShieldCheck className="h-3.5 w-3.5" />Available on your test account too.</p> : null}
        </div>
        <div aria-hidden="true" className="relative mr-2 hidden h-[155px] w-[158px] shrink-0 rotate-[5deg] rounded-[25px] border-[5px] border-slate-600/80 bg-gradient-to-b from-sky-100 to-slate-50 px-3 pt-4 shadow-2xl min-[1100px]:block">
          <div className="mx-auto -mt-3 h-1.5 w-12 rounded-full bg-slate-600" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mover-app/icon-192.png" alt="" className="mx-auto mt-3 h-10 w-10 rounded-xl" />
          <div className="absolute -left-12 right-2 top-[78px] -rotate-[5deg] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><span className="grid h-5 w-5 place-items-center rounded-md bg-orange-100 text-orange-600"><Bell className="h-3 w-3" /></span>MATCH &apos;N MOVE<span className="ml-auto font-normal">now</span></div>
            <p className="mt-2 text-xs font-extrabold text-slate-900">New moving quote available</p><p className="mt-1 text-[10px] text-slate-500">Your next opportunity is ready.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-px border-t border-white/10 bg-white/10 md:grid-cols-2">
        <div className="bg-[#122238] p-5 sm:px-7">
          <div className="flex items-center gap-2 text-sm font-bold"><span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${installed ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white"}`}>{installed ? <Check className="h-3.5 w-3.5" /> : "1"}</span>{installed ? "App installed" : "Install your app"}</div>
          <p className="mt-2 min-h-10 text-xs leading-5 text-slate-300">{installed ? "You're ready. Open Match 'n Move from your app icon anytime." : "A dedicated app window. Your existing account. Everything in one place."}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!installed ? <button type="button" onClick={() => void install()} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 disabled:opacity-60">{busy === "install" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}Install the mover app</button> : <span className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" />Ready to go</span>}
            <button type="button" onClick={showGuide} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-sky-200 underline decoration-sky-200/30 underline-offset-4 hover:text-white">How to install<ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="bg-[#122238] p-5 sm:px-7">
          <div className="flex items-center gap-2 text-sm font-bold"><span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${pushState === "on" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white"}`}>{pushState === "on" ? <Check className="h-3.5 w-3.5" /> : "2"}</span>{pushState === "on" ? "Notifications on" : "Turn on notifications"}</div>
          <p className="mt-2 min-h-10 text-xs leading-5 text-slate-300">{notificationDetail}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {pushState === "on" ? <><button type="button" onClick={() => void sendTest()} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200/30 bg-sky-400/10 px-4 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-400/20 disabled:opacity-60">{busy === "test" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}Send test notification</button><button type="button" onClick={() => void disable()} disabled={Boolean(busy)} className="min-h-11 text-xs font-semibold text-slate-300 underline underline-offset-4 disabled:opacity-50">Turn off</button></>
              : iosNeedsInstall ? <button type="button" onClick={showGuide} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">Install first<ArrowRight className="h-4 w-4" /></button>
              : pushState === "unsupported" ? <button type="button" onClick={showGuide} className="min-h-11 text-sm font-semibold text-sky-200 underline underline-offset-4">See supported devices</button>
              : <button type="button" onClick={() => void enable()} disabled={Boolean(busy) || pushState === "loading" || pushState === "blocked" || !settings?.ready} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50">{busy === "enable" || pushState === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}{pushState === "loading" ? "Checking this device…" : pushState === "blocked" ? "Blocked in settings" : "Enable notifications"}</button>}
          </div>
        </div>
      </div>
      <div className="px-5 py-3 sm:px-7">
        <p className="text-[11px] leading-5 text-slate-400">Phone alerts are optional. Email alerts stay on. Customer details are only shown inside your signed-in dashboard.</p>
        {notice ? <p role="status" className="mt-2 text-sm leading-5 text-emerald-200">{notice}</p> : null}
        {error ? <p role="alert" className="mt-2 text-sm leading-5 text-orange-200">{error}</p> : null}
      </div>
      </div>
      <dialog ref={dialogRef} className="m-auto max-h-[90dvh] w-[calc(100%_-_24px)] max-w-lg overflow-y-auto rounded-[28px] border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/65" onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }} aria-labelledby="install-guide-heading">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">Take your dashboard with you</p><h3 id="install-guide-heading" className="mt-2 text-2xl font-black tracking-tight">Install Match &apos;n Move</h3></div><button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close install guide" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 hover:bg-slate-200"><X className="h-5 w-5" /></button></div>
          <div className="mt-5 grid grid-cols-3 rounded-xl bg-slate-100 p-1" aria-label="Device instructions">
            {([{ id: "ios", label: "iPhone / iPad", icon: Smartphone }, { id: "android", label: "Android", icon: Smartphone }, { id: "desktop", label: "Computer", icon: Monitor }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={guide === id} onClick={() => setGuide(id)} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-1 text-[11px] font-bold transition sm:text-xs ${guide === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
          </div>
        </div>
        <ol className="space-y-5 px-6 py-6">{guides[guide].map((step, index) => <li key={step.title} className="flex gap-3.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-extrabold text-orange-700">{index + 1}</span><div><h4 className="pt-0.5 text-sm font-bold">{step.title}{guide === "ios" && index === 1 ? <span className="ml-2 inline-flex gap-1 align-middle text-sky-700"><Share className="h-4 w-4" /><MoreHorizontal className="h-4 w-4" /></span> : null}</h4><p className="mt-1.5 text-sm leading-6 text-slate-600">{step.text}</p></div></li>)}</ol>
        <div className="px-6 pb-6"><div className="rounded-2xl bg-sky-50 p-4 text-xs leading-5 text-sky-900">Use the same email and password as your mover account. You don&apos;t need to create another account or visit an app store.</div><button type="button" onClick={() => dialogRef.current?.close()} className="mt-4 min-h-12 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">Got it</button></div>
      </dialog>
    </section>
  );
}
