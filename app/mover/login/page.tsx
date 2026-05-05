"use client";

import { Nav } from "@/components/site-shell";
import { NzRegionSelector } from "@/components/nz-region-selector";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { FormEvent, startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Building2, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { type NzServiceArea } from "@/lib/nz-regions";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              text?: string;
              shape?: string;
              size?: string;
              width?: number;
              logo_alignment?: string;
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

const trustPoints = [
  "Create a mover profile that saves your company details with Match 'n Move",
  "Passwords are hashed before storage and sessions are locked into secure HTTP-only cookies",
  "Google sign-in is available for faster access when your Google client ID is configured"
];

const onboardingSteps = [
  { label: "Create account", detail: "Business details, secure password, coverage regions" },
  { label: "Complete profile", detail: "Logo, documents, company basics, contact settings" },
  { label: "Start receiving leads", detail: "Unlock high-intent enquiries from your dashboard" }
];

type Mode = "login" | "signup";

export default function MoverLoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleRenderedRef = useRef(false);

  const [mode, setMode] = useState<Mode>("signup");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    serviceAreas: ["Auckland"] as NzServiceArea[],
    acceptedTerms: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const passwordChecks = [
    { label: "8+ characters", valid: signupForm.password.length >= 8 },
    { label: "Uppercase", valid: /[A-Z]/.test(signupForm.password) },
    { label: "Lowercase", valid: /[a-z]/.test(signupForm.password) },
    { label: "Number", valid: /[0-9]/.test(signupForm.password) }
  ];

  useEffect(() => {
    googleRenderedRef.current = false;
    if (googleButtonRef.current) {
      googleButtonRef.current.innerHTML = "";
    }
  }, [mode]);

  const submitGoogleCredential = useEffectEvent(async (credential: string) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/mover/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential })
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error || "Google sign-in failed");
        return;
      }

      setSuccess("Signed in with Google. Redirecting to your mover dashboard...");
      startTransition(() => router.push("/mover/dashboard"));
    } finally {
      setSubmitting(false);
    }
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleReady || !googleButtonRef.current || googleRenderedRef.current) return;
    const google = window.google?.accounts?.id;
    if (!google) return;

    google.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        if (!response.credential) {
          setError("Google sign-in did not return a credential. Please try again.");
          return;
        }

        await submitGoogleCredential(response.credential);
      }
    });

    google.renderButton(googleButtonRef.current, {
      theme: "outline",
      text: mode === "signup" ? "signup_with" : "signin_with",
      shape: "pill",
      size: "large",
      width: 340,
      logo_alignment: "left"
    });

    googleRenderedRef.current = true;
  }, [googleReady, mode]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/mover/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error || "Unable to log in");
        return;
      }

      setSuccess("Welcome back. Taking you to your dashboard...");
      startTransition(() => router.push("/mover/dashboard"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/mover/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...signupForm,
          serviceAreas: signupForm.serviceAreas
        })
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string; verificationEmailSent?: boolean };
      if (!res.ok) {
        setError(payload.error || "Unable to create account");
        return;
      }

      setSuccess(
        payload.verificationEmailSent
          ? "Your Match 'n Move mover account is ready. Check your inbox for a verification email while we take you to the dashboard..."
          : "Your Match 'n Move mover account is ready. Email verification is available once SMTP is configured, and we’re taking you to the dashboard now..."
      );
      startTransition(() => router.push("/mover/dashboard"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setGoogleReady(true)} />
      <Nav />
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#edf4fb_0%,#e9f1fb_28%,#f7fbff_100%)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8%] top-12 h-52 w-52 rounded-full bg-sky-200/60 blur-3xl" />
          <div className="absolute right-[-5%] top-20 h-72 w-72 rounded-full bg-indigo-200/60 blur-3xl" />
          <div className="absolute bottom-[-6rem] left-[16%] h-64 w-64 rounded-full bg-orange-100/80 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent)]" />
        </div>

        <div className="container-shell relative py-10 md:py-14 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200/90 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Mover Access
              </p>
              <h1 className="mt-5 text-[clamp(3rem,8vw,5.6rem)] font-black leading-[0.9] tracking-[-0.07em] text-slate-950">
                Build your
                <span className="block bg-[linear-gradient(135deg,#5f6ee8_0%,#4ba7f3_52%,#de7a3a_100%)] bg-clip-text text-transparent">
                  Match &apos;n Move lane
                </span>
              </h1>
              <p className="mt-5 max-w-[34rem] text-base leading-7 text-slate-600 sm:text-lg">
                Sign up as a moving company, save your business details with us, and step straight into a dashboard designed to convert real move requests into booked jobs.
              </p>

              <div className="mt-6 hidden rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_22px_45px_-32px_rgba(15,23,42,0.28)] backdrop-blur sm:hidden">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Mover setup</p>
                <p className="mt-3 text-lg font-bold tracking-[-0.03em] text-slate-950">A fast path from sign-up to lead-ready.</p>
                <div className="mt-4 space-y-3">
                  {onboardingSteps.map((step, index) => (
                    <div key={step.label} className="group relative">
                      <div className="pointer-events-none absolute inset-x-5 -bottom-3 h-10 rounded-full bg-[rgba(222,122,58,0.18)] blur-2xl transition duration-300 group-hover:bg-[rgba(222,122,58,0.4)] group-hover:blur-3xl" />
                      <div
                        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_24px_48px_-24px_rgba(222,122,58,0.38)]"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.2),transparent_55%)] opacity-70" />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_70%)] opacity-0 transition duration-300 group-hover:opacity-100" />
                        <div className="relative flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 transition duration-300 group-hover:text-orange-500">Step {index + 1}</span>
                          <ArrowRight className="h-4 w-4 text-brandBlue transition duration-300 group-hover:translate-x-0.5 group-hover:text-orange-500" />
                        </div>
                        <p className="relative mt-3 text-base font-bold text-slate-950">{step.label}</p>
                        <p className="relative mt-1 text-sm leading-6 text-slate-500">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 hidden gap-4 sm:grid sm:grid-cols-3">
                {onboardingSteps.map((step, index) => (
                  <div key={step.label} className="group relative">
                    <div className="pointer-events-none absolute inset-x-6 bottom-1 h-14 rounded-full bg-[rgba(222,122,58,0.18)] blur-3xl transition duration-300 group-hover:bg-[rgba(222,122,58,0.42)] group-hover:blur-[56px]" />
                    <div className="pointer-events-none absolute inset-x-10 -bottom-2 h-10 rounded-full bg-[rgba(255,192,145,0.12)] opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />
                    <div
                      className="relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_22px_45px_-32px_rgba(15,23,42,0.35)] backdrop-blur transition duration-300 hover:-translate-y-2 hover:border-orange-200/80 hover:shadow-[0_28px_54px_-22px_rgba(222,122,58,0.34)]"
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.24),transparent_52%)] opacity-80" />
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(255,196,152,0.18),transparent_45%)] opacity-0 transition duration-300 group-hover:opacity-100" />
                      <div className="relative flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400 transition duration-300 group-hover:text-orange-500">Step {index + 1}</span>
                        <ArrowRight className="h-4 w-4 text-brandBlue transition duration-300 group-hover:translate-x-1 group-hover:text-orange-500" />
                      </div>
                      <p className="relative mt-4 min-h-[4.5rem] text-lg font-bold text-slate-950">{step.label}</p>
                      <p className="relative mt-2 text-sm leading-6 text-slate-500">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(25,45,78,0.92))] p-5 text-white shadow-[0_32px_70px_-34px_rgba(15,23,42,0.8)] sm:block sm:mt-8 sm:rounded-[34px] sm:p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  Account security built in
                </div>
                <div className="mt-4 space-y-3 sm:mt-5">
                  {trustPoints.map((point) => (
                    <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <p className="text-sm leading-6 text-slate-200 sm:text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-1/2 top-0 hidden h-24 w-24 -translate-x-1/2 rounded-full border border-white/70 bg-white/35 blur-sm md:block lg:left-auto lg:-left-4 lg:translate-x-0" />
              <div className="absolute left-1/2 bottom-8 hidden h-32 w-32 -translate-x-1/2 rounded-full border border-indigo-100 bg-indigo-100/50 blur-sm md:block lg:left-auto lg:-right-5 lg:translate-x-0" />

              <div className="relative mx-auto w-full max-w-[38rem] rounded-[30px] border border-white/80 bg-white/82 p-3 shadow-[0_34px_80px_-38px_rgba(44,62,88,0.45)] backdrop-blur sm:rounded-[34px] sm:p-4 xl:p-5">
                <div className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fc_100%)] p-5 sm:rounded-[30px] sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Partner portal</p>
                      <h2 className="mt-2 text-[clamp(2rem,8vw,3rem)] font-black tracking-[-0.04em] text-slate-950">
                        {mode === "signup" ? "Create your mover account" : "Welcome back"}
                      </h2>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 sm:max-w-md">
                        {mode === "signup"
                          ? "Set up the account movers will use to manage their profile, team details, and purchased leads."
                          : "Sign in to review leads, update your company profile, and keep your Match 'n Move presence current."}
                      </p>
                    </div>
                    <div className="mx-auto inline-flex w-full max-w-[16rem] rounded-full border border-slate-200 bg-slate-100 p-1 text-sm font-semibold sm:mx-0 sm:w-auto sm:max-w-none">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signup");
                          setError("");
                          setSuccess("");
                        }}
                        className={`flex-1 rounded-full px-4 py-2 transition sm:flex-none ${mode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                      >
                        Sign up
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setError("");
                          setSuccess("");
                        }}
                        className={`flex-1 rounded-full px-4 py-2 transition sm:flex-none ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                      >
                        Log in
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_15px_30px_-24px_rgba(15,23,42,0.35)] sm:rounded-[26px]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-brandBlue">
                        {mode === "signup" ? <Building2 className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950">
                          {mode === "signup" ? "Mover company onboarding" : "Secure mover login"}
                        </p>
                        <p className="text-sm leading-6 text-slate-500">
                          {mode === "signup" ? `${signupForm.serviceAreas.length} coverage region${signupForm.serviceAreas.length === 1 ? "" : "s"} ready to save` : "7-day secure session on successful sign-in"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center">
                    {GOOGLE_CLIENT_ID ? (
                      <div ref={googleButtonRef} className="min-h-[44px] w-full max-w-[340px]" />
                    ) : (
                      <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm leading-6 text-slate-500">
                        Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable one-click Google sign-in for movers.
                      </div>
                    )}
                  </div>

                  <div className="my-6 flex items-center gap-3 sm:gap-4">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-xs sm:tracking-[0.22em]">or continue with email</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  {mode === "signup" ? (
                    <form onSubmit={handleSignupSubmit} className="space-y-4">
                      <div className="grid gap-4">
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">Full name</span>
                          <input
                            required
                            value={signupForm.name}
                            onChange={(event) => setSignupForm((current) => ({ ...current, name: event.target.value }))}
                            className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-[15px] placeholder:text-slate-400 focus:border-brandBlue focus:ring-4 focus:ring-indigo-100 sm:text-base sm:placeholder:text-base"
                            placeholder="Alex Morgan"
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">Company name</span>
                          <input
                            required
                            value={signupForm.companyName}
                            onChange={(event) => setSignupForm((current) => ({ ...current, companyName: event.target.value }))}
                            className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-[15px] placeholder:text-slate-400 focus:border-brandBlue focus:ring-4 focus:ring-indigo-100 sm:text-base sm:placeholder:text-base"
                            placeholder="North Harbour Movers"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4">
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">Work email</span>
                          <input
                            required
                            type="email"
                            value={signupForm.email}
                            onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
                            className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-[15px] placeholder:text-slate-400 focus:border-brandBlue focus:ring-4 focus:ring-indigo-100 sm:text-base sm:placeholder:text-base"
                            placeholder="ops@yourmovingcompany.co.nz"
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">Phone</span>
                          <input
                            required
                            value={signupForm.phone}
                            onChange={(event) => setSignupForm((current) => ({ ...current, phone: event.target.value }))}
                            className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-[15px] placeholder:text-slate-400 focus:border-brandBlue focus:ring-4 focus:ring-indigo-100 sm:text-base sm:placeholder:text-base"
                            placeholder="+64 21 555 0123"
                          />
                        </label>
                      </div>

                      <NzRegionSelector
                        selectedRegions={signupForm.serviceAreas}
                        onChange={(regions) => setSignupForm((current) => ({ ...current, serviceAreas: regions }))}
                        title="Coverage regions"
                        description="Choose the official NZ regions your moving company services so the right leads reach your dashboard."
                        className="bg-white"
                      />

                      <div className="grid gap-4">
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                          <div className="relative">
                            <input
                              required
                              type={showPassword ? "text" : "password"}
                              value={signupForm.password}
                              onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
                              className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-[15px] text-slate-900 outline-none transition placeholder:text-[15px] placeholder:text-slate-400 focus:border-brandBlue focus:ring-4 focus:ring-indigo-100 sm:text-base sm:placeholder:text-base"
                              placeholder="Create a secure password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((current) => !current)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </label>

                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</span>
                          <div className="relative">
                            <input
                              required
                              type={showConfirmPassword ? "text" : "password"}
                              value={signupForm.confirmPassword}
                              onChange={(event) => setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                              className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-[15px] text-slate-900 outline-none transition placeholder:text-[15px] placeholder:text-slate-400 focus:border-brandBlue focus:ring-4 focus:ring-indigo-100 sm:text-base sm:placeholder:text-base"
                              placeholder="Re-enter password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((current) => !current)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </label>
                      </div>

                      <div className="rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800">Password checklist</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {passwordChecks.map((check) => (
                            <div key={check.label} className="flex items-center gap-2 text-sm">
                              <span className={`inline-block h-2.5 w-2.5 rounded-full ${check.valid ? "bg-emerald-500" : "bg-slate-300"}`} />
                              <span className={check.valid ? "text-slate-800" : "text-slate-500"}>{check.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <input
                          required
                          type="checkbox"
                          checked={signupForm.acceptedTerms}
                          onChange={(event) => setSignupForm((current) => ({ ...current, acceptedTerms: event.target.checked }))}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brandBlue focus:ring-brandBlue"
                        />
                        <span className="text-sm leading-6 text-slate-600">
                          I agree to the{" "}
                          <Link href="/terms" className="font-semibold text-brandBlue hover:text-indigo-700">
                            Terms
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="font-semibold text-brandBlue hover:text-indigo-700">
                            Privacy Policy
                          </Link>
                          .
                        </span>
                      </label>

                      <button
                        disabled={submitting}
                        className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,#5f6ee8_0%,#4f7cf0_45%,#3ca5e8_100%)] px-5 py-3 text-base font-semibold text-white shadow-[0_20px_35px_-20px_rgba(95,110,232,0.8)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {submitting ? "Creating account..." : "Create mover account"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                        <input
                          required
                          type="email"
                          value={loginForm.email}
                          onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brandBlue focus:ring-4 focus:ring-indigo-100"
                          placeholder="you@company.com"
                        />
                      </label>

                      <label className="block">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-700">Password</span>
                          <Link href="/mover/forgot-password" className="text-sm font-semibold text-brandBlue hover:text-indigo-700">
                            Forgot password?
                          </Link>
                        </div>
                        <div className="relative">
                          <input
                            required
                            type={showPassword ? "text" : "password"}
                            value={loginForm.password}
                            onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-brandBlue focus:ring-4 focus:ring-indigo-100"
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </label>

                      <button
                        disabled={submitting}
                        className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,#5f6ee8_0%,#4f7cf0_45%,#3ca5e8_100%)] px-5 py-3 text-base font-semibold text-white shadow-[0_20px_35px_-20px_rgba(95,110,232,0.8)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {submitting ? "Logging in..." : "Log in"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </form>
                  )}

                  {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
                  {success ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

                  <p className="mt-5 text-center text-sm text-slate-500">
                    {mode === "signup" ? "Already have a mover account?" : "Need a new mover account?"}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === "signup" ? "login" : "signup");
                        setError("");
                        setSuccess("");
                      }}
                      className="font-semibold text-brandBlue hover:text-indigo-700"
                    >
                      {mode === "signup" ? "Log in instead" : "Create one here"}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
