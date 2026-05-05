"use client";

import { Nav } from "@/components/site-shell";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/mover/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(payload.error || "Could not start password reset.");
        return;
      }
      setMessage(payload.message || "If an account exists, a reset link has been sent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Nav />
      <section className="min-h-screen bg-[linear-gradient(180deg,#edf4fb_0%,#f8fbff_100%)] py-12">
        <div className="container-shell max-w-2xl">
          <div className="rounded-[32px] border border-white/80 bg-white/85 p-8 shadow-[0_30px_70px_-38px_rgba(15,23,42,0.35)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Account recovery</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950">Reset your mover password</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Enter the email used for your Match &apos;n Move mover account and we&apos;ll send you a secure password reset link.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brandBlue focus:ring-4 focus:ring-indigo-100"
                  placeholder="ops@yourmovingcompany.co.nz"
                />
              </label>

              <button
                disabled={submitting}
                className="w-full rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-70"
              >
                {submitting ? "Sending reset link..." : "Send reset link"}
              </button>
            </form>

            {message ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <p className="mt-5 text-sm text-slate-500">
              Remembered it?{" "}
              <Link href="/mover/login" className="font-semibold text-brandBlue hover:text-indigo-700">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
