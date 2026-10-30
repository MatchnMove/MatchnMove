"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, ChevronDown, Eye, EyeOff, Sparkles } from "lucide-react";
import { PartnerAuthShell, partnerButtonClass, partnerInputClass, partnerLinkClass } from "@/components/partner-auth-shell";
import { partnerAuthHref, partnerAuthReturnPath, type PartnerBusiness, type PartnerAuthMode } from "@/lib/partner-auth-navigation";
import { cleanerRegisterSchema, moverRegisterSchema } from "@/lib/validators";
import { formatCleaningLeadPrice } from "@/lib/cleaner-lead-pricing";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { useLanguage } from "@/components/language-provider";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
type GoogleIdentity = { initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, string | number>) => void };
type Step = "email" | "password" | "code" | "details" | "security" | "business";
type AuthResponse = { error?: string; email?: string; emailCodeRequired?: boolean; adminMfaRequired?: boolean; verificationEmailSent?: boolean };
type SignupForm = { name: string; companyName: string; phone: string; password: string; confirmPassword: string; acceptedTerms: boolean };
const emptySignup: SignupForm = { name: "", companyName: "", phone: "", password: "", confirmPassword: "", acceptedTerms: false };

export function PartnerAuth({ business, initialMode = "login", appMode = false }: { business: PartnerBusiness; initialMode?: PartnerAuthMode; appMode?: boolean }) {
  const { locale, t } = useLanguage();
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeEmail, setCodeEmail] = useState("");
  const [signup, setSignup] = useState(emptySignup);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nextPath, setNextPath] = useState(`/${business}/dashboard`);
  const [googleReady, setGoogleReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const googleButton = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const isCleaner = business === "cleaner";
  const copy = (key: string, fallback: string) => isCleaner ? t(`cleanerAuth.${key}`) : fallback;
  const number = step === "email" || step === "business" ? 1 : step === "password" || step === "details" ? 2 : 3;
  const title = step === "business" ? "Choose your business"
    : step === "email" ? mode === "login" ? "Welcome back" : "Create your account"
    : step === "password" ? "Enter your password"
    : step === "code" ? copy("login.checkEmailTitle", "Check your email")
    : step === "details" ? "About your business" : "Secure your account";
  const description = step === "business" ? "Which account would you like to use?"
    : step === "email" ? `Use your ${isCleaner ? "cleaning" : "moving"} company email to ${mode === "login" ? "sign in" : "get started"}.`
    : step === "password" ? "Enter the password for your account."
    : step === "code" ? `Enter the six-digit code sent to ${codeEmail}.`
    : step === "details" ? "A few details to set up your company profile." : "Choose a strong password to finish setting up.";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(partnerAuthReturnPath(business, params.get("next"), appMode));
    if (params.get("account") === "deleted") { setMode("login"); setNotice("Your account and its Match 'n Move data were permanently deleted."); }
  }, [business, appMode]);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus({ preventScroll: true });
  }, [step, mode]);

  function go(next: Step) { setError(""); setNotice(""); setShowPassword(false); setStep(next); }
  function switchMode() {
    const nextMode = mode === "login" ? "signup" : "login";
    setMode(nextMode); setPassword(""); setCode(""); setCodeEmail("");
    setSignup(current => ({ ...current, password: "", confirmPassword: "", acceptedTerms: false }));
    go("email");
    const url = new URL(window.location.href);
    if (business === "mover") url.searchParams.set("mode", nextMode);
    else url.pathname = partnerAuthHref(business, nextMode);
    if (nextMode === "signup") { url.searchParams.delete("next"); setNextPath(`/${business}/dashboard`); }
    window.history.replaceState(null, "", url);
  }
  function back() { go(step === "details" || step === "password" || step === "business" ? "email" : step === "security" ? "details" : "password"); }
  function destination(admin = false) { return admin ? `/admin/mfa?next=${encodeURIComponent(nextPath.startsWith("/admin/") ? nextPath : "/admin/recruitment")}` : nextPath; }
  function finish(admin = false) { setNotice("Signed in. Opening your dashboard…"); window.location.replace(destination(admin)); }
  async function request(path: string, body: unknown) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})) as AuthResponse;
    if (!response.ok) throw new Error(data.error || "We couldn’t complete that request. Please try again.");
    return data;
  }
  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (cause) { setError(cause instanceof TypeError ? "We couldn’t reach the server. Check your connection and try again." : cause instanceof Error ? cause.message : "Please try again."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function sendCode() {
    await run(async () => {
      const data = await request(`/api/${business}/login`, { email, password });
      if (data.emailCodeRequired) { setCodeEmail(data.email || email); setCode(""); setStep("code"); }
      else finish(data.adminMfaRequired);
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    setError(""); setNotice("");
    if (step === "email") { setEmail(email.trim().toLowerCase()); go(mode === "login" ? "password" : "details"); return; }
    if (step === "password") { await sendCode(); return; }
    if (step === "details") {
      if (signup.name.trim().length < 2 || signup.companyName.trim().length < 2) { setError("Enter your full name and company name."); return; }
      if (signup.phone.trim().length < 7 || (isCleaner && !/^[+\d][\d\s()-]{6,24}$/.test(signup.phone.trim()))) { setError("Enter a valid phone number."); return; }
      go("security"); return;
    }
    if (step === "code") {
      await run(async () => { const data = await request(`/api/${business}/login/verify-code`, { email: codeEmail, code }); finish(data.adminMfaRequired); });
      return;
    }
    const body = { ...signup, email };
    const parsed = (isCleaner ? cleanerRegisterSchema : moverRegisterSchema).safeParse(body);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check your account details."); return; }
    await run(async () => {
      await request(`/api/${business}/register`, body);
      trackAnalyticsEvent("partner_registration_completed", { source: business });
      setNotice("Account created. Opening your dashboard…"); window.location.replace(nextPath);
    });
  }
  const googleCredential = useEffectEvent(async (credential: string) => {
    await run(async () => { const data = await request("/api/mover/google", { credential }); finish(data.adminMfaRequired); });
  });
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleReady || !googleButton.current || step !== "email" || isCleaner) return;
    const google = (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;
    if (!google) return;
    googleButton.current.replaceChildren();
    google.initialize({ client_id: GOOGLE_CLIENT_ID, callback: response => { if (response.credential) void googleCredential(response.credential); else setError("Google sign-in did not complete. Please try again."); } });
    google.renderButton(googleButton.current, { type: "standard", theme: "outline", text: "continue_with", shape: "rectangular", size: "large", width: Math.max(200, Math.min(400, Math.floor(googleButton.current.getBoundingClientRect().width))) });
  }, [googleReady, step, mode, isCleaner]);

  function field(label: string, name: keyof SignupForm, options: { type?: string; autoComplete?: string; minLength?: number; maxLength?: number } = {}) {
    return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} required {...options} value={String(signup[name])} onChange={event => setSignup(current => ({ ...current, [name]: event.target.value }))} className={partnerInputClass} /></label>;
  }
  function passwordInput(value: string, onChange: (value: string) => void, newPassword = false) {
    return <span className="relative block"><input id={newPassword ? "signup-password" : "login-password"} name="password" required minLength={newPassword ? 8 : undefined} maxLength={128} type={showPassword ? "text" : "password"} autoComplete={newPassword ? "new-password" : "current-password"} aria-describedby={newPassword ? "password-guidance" : undefined} value={value} onChange={event => onChange(event.target.value)} className={`${partnerInputClass} pr-12`} /><button type="button" aria-label={showPassword ? copy("login.hidePassword", "Hide password") : copy("login.showPassword", "Show password")} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute bottom-0 right-0 grid h-12 w-12 place-items-center rounded-r-lg text-slate-500 hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>;
  }
  return <PartnerAuthShell appMode={appMode}>
    {GOOGLE_CLIENT_ID && !isCleaner && <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setGoogleReady(true)} />}
    {step !== "business" && <div className="mb-6">
      <div className="mb-3 flex min-h-8 items-center justify-between gap-3 text-xs text-slate-500">
        {step !== "email" ? <button type="button" disabled={busy} onClick={back} className={`${partnerLinkClass} inline-flex min-h-8 items-center gap-1.5`}><ArrowLeft size={14} />Back</button>
          : appMode ? <span>Mover app</span>
          : <button type="button" aria-label="Change business type" disabled={busy} onClick={() => go("business")} className={`${partnerLinkClass} inline-flex min-h-8 items-center gap-1`}>{isCleaner ? "Cleaning company" : "Moving company"}<ChevronDown size={13} /></button>}
        <span>Step {number} of 3</span>
      </div>
      <div role="progressbar" aria-label={mode === "login" ? "Login progress" : "Sign-up progress"} aria-valuemin={1} aria-valuemax={3} aria-valuenow={number} className="flex gap-1.5">{[1, 2, 3].map(item => <span key={item} className={`h-1 flex-1 rounded-full ${item <= number ? "bg-sky-700" : "bg-slate-100"}`} />)}</div>
    </div>}
    {step === "business" && <button type="button" onClick={back} className={`${partnerLinkClass} mb-5 inline-flex min-h-8 items-center gap-1.5 text-xs`}><ArrowLeft size={14} />Back</button>}
    <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-slate-900 outline-none">{title}</h1>
    <p className="mt-2 break-words text-sm leading-6 text-slate-500">{description}</p>
    {step === "business" ? <div className="mt-7 space-y-3">{([['mover', Building2, 'Moving company'], ['cleaner', Sparkles, 'Cleaning company']] as const).map(([id, Icon, label]) => <Link key={id} href={partnerAuthHref(id, mode)} onClick={event => { if (id === business) { event.preventDefault(); go("email"); } }} className="flex min-h-16 items-center gap-3 rounded-lg border border-slate-200 px-4 py-4 text-sm font-medium hover:border-sky-600 hover:bg-sky-50"><Icon size={20} className="text-sky-700" />{label}<ArrowRight size={16} className="ml-auto text-slate-400" /></Link>)}</div> : <>
      {(step === "password" || step === "security") && <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="min-w-0 truncate" title={email}>{email}</span><button disabled={busy} type="button" onClick={() => go("email")} className={`${partnerLinkClass} min-h-8 shrink-0 text-xs`}>Change</button></div>}
      <form onSubmit={submit} className="mt-6" aria-busy={busy}>
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          {step === "email" && <label className="block text-sm font-medium text-slate-700">{copy("login.email", "Email address")}<input name="email" required type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setPassword(""); setCode(""); }} className={partnerInputClass} /></label>}
          {step === "password" && <>
            <input type="text" name="email" autoComplete="username" value={email} readOnly hidden />
            <div><div className="flex items-center justify-between gap-3"><label htmlFor="login-password" className="text-sm font-medium text-slate-700">{copy("login.password", "Password")}</label><Link href={`/${business}/forgot-password`} className={`${partnerLinkClass} text-xs`}>{copy("login.forgotPassword", "Forgot password?")}</Link></div>{passwordInput(password, setPassword)}</div>
          </>}
          {step === "code" && <>
            <label className="block text-sm font-medium text-slate-700">{copy("login.codeLabel", "Six-digit sign-in code")}<input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={`${partnerInputClass} text-center text-xl tracking-[0.3em]`} /></label>
            <p className="text-xs leading-5 text-slate-500">Check Spam or Junk too. Your code expires after 15 minutes.</p>
          </>}
          {step === "details" && <>
            {field(copy("register.fullName", "Your full name"), "name", { autoComplete: "name", minLength: 2, maxLength: 100 })}
            {field(copy("register.company", "Company name"), "companyName", { autoComplete: "organization", minLength: 2, maxLength: 160 })}
            {field(copy("register.phone", "Phone number"), "phone", { type: "tel", autoComplete: "tel", minLength: 7, maxLength: 25 })}
          </>}
          {step === "security" && <>
            <input type="text" name="email" autoComplete="username" value={email} readOnly hidden />
            <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700">{copy("register.password", "Password")}{passwordInput(signup.password, value => setSignup(current => ({ ...current, password: value })), true)}</label>
            <p id="password-guidance" className="!mt-2 text-xs leading-5 text-slate-500">Use at least 8 characters, with uppercase, lowercase and a number.</p>
            {field(copy("register.confirmPassword", "Confirm password"), "confirmPassword", { type: showPassword ? "text" : "password", autoComplete: "new-password", minLength: 8, maxLength: 128 })}
            <label className="flex items-start gap-3 text-xs leading-6 text-slate-600"><input name="acceptedTerms" type="checkbox" required checked={signup.acceptedTerms} onChange={event => setSignup(current => ({ ...current, acceptedTerms: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 accent-sky-800" /><span>{copy("register.termsAgree", "I agree to the")} <Link target="_blank" rel="noopener noreferrer" href="/terms" className={partnerLinkClass}>Terms</Link> and <Link target="_blank" rel="noopener noreferrer" href="/privacy" className={partnerLinkClass}>Privacy Policy</Link>{isCleaner ? `, ${t("cleanerAuth.register.fixedCharge", { price: formatCleaningLeadPrice(locale) })}` : "."}</span></label>
          </>}
          {error && <Notice kind="error">{error}</Notice>}
          {notice && <Notice>{notice}</Notice>}
          <button type="submit" disabled={busy || (step === "code" && code.length !== 6)} className={partnerButtonClass}>{busy ? "Please wait…" : step === "password" ? "Sign in" : step === "code" ? "Verify & sign in" : step === "security" ? "Create account" : "Continue"}<ArrowRight size={16} aria-hidden="true" /></button>
        </fieldset>
      </form>
      {step === "code" && <button type="button" disabled={busy} onClick={() => void sendCode()} className={`${partnerLinkClass} mt-5 min-h-10 w-full text-center text-sm`}>Send a new code</button>}
      {step === "email" && GOOGLE_CLIENT_ID && !isCleaner && <div className="mt-6"><div className="mb-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div><div ref={googleButton} className={`min-h-11 w-full ${busy ? "pointer-events-none opacity-60" : ""}`} /></div>}
      {step === "email" && <p className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">{mode === "login" ? "New to Match ’n Move?" : "Already have an account?"} <button type="button" disabled={busy} onClick={switchMode} className={`${partnerLinkClass} inline-flex min-h-8 items-center`}>{mode === "login" ? "Create account" : "Sign in"}</button></p>}
    </>}
  </PartnerAuthShell>;
}

function Notice({ children, kind = "info" }: { children: ReactNode; kind?: "error" | "info" }) {
  return <p role={kind === "error" ? "alert" : "status"} className={`break-words rounded-lg px-3 py-2.5 text-sm leading-6 ${kind === "error" ? "bg-red-50 text-red-800" : "bg-sky-50 text-sky-900"}`}>{children}</p>;
}
