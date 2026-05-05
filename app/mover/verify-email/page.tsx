"use client";

import { Suspense, useEffect, useState } from "react";
import { Nav } from "@/components/site-shell";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "Verifying your email..." : "This verification link is missing a token.");

  useEffect(() => {
    if (!token) return;

    let active = true;
    async function verify() {
      const res = await fetch("/api/mover/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!active) return;

      if (!res.ok) {
        setStatus("error");
        setMessage(payload.error || "This verification link is invalid or has expired.");
        return;
      }

      setStatus("success");
      setMessage("Your email is verified. Your Match 'n Move mover account is now fully secured.");
    }

    void verify();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="rounded-[32px] border border-white/80 bg-white/85 p-8 shadow-[0_30px_70px_-38px_rgba(15,23,42,0.35)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Email verification</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950">Confirm your mover account</h1>
      <p
        className={`mt-6 rounded-2xl px-4 py-4 text-sm leading-7 ${
          status === "success"
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : status === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-sky-200 bg-sky-50 text-sky-700"
        }`}
      >
        {message}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/mover/login" className="rounded-2xl bg-brandBlue px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600">
          Go to mover login
        </Link>
        <Link href="/mover/dashboard" className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Open dashboard
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Nav />
      <section className="min-h-screen bg-[linear-gradient(180deg,#edf4fb_0%,#f8fbff_100%)] py-12">
        <div className="container-shell max-w-2xl">
          <Suspense
            fallback={
              <div className="rounded-[32px] border border-white/80 bg-white/85 p-8 shadow-[0_30px_70px_-38px_rgba(15,23,42,0.35)] backdrop-blur">
                <p className="text-sm text-slate-600">Loading verification...</p>
              </div>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </div>
      </section>
    </>
  );
}
