"use client";

import { Suspense, FormEvent, useState } from "react";
import { Nav } from "@/components/site-shell";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/mover/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword })
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error || "Could not reset password.");
        return;
      }
      setMessage("Your password has been updated. You can log in with the new password now.");
      setPassword("");
      setConfirmPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[32px] border border-white/80 bg-white/85 p-8 shadow-[0_30px_70px_-38px_rgba(15,23,42,0.35)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">New password</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950">Choose a fresh password</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Use a strong password for your Match &apos;n Move mover account. Reset links expire automatically for safety.
      </p>

      {!token ? (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This reset link is missing a token. Request a new password reset email.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">New password</span>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brandBlue focus:ring-4 focus:ring-indigo-100"
              placeholder="Create a strong password"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</span>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brandBlue focus:ring-4 focus:ring-indigo-100"
              placeholder="Confirm your new password"
            />
          </label>

          <button
            disabled={submitting}
            className="w-full rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-70"
          >
            {submitting ? "Updating password..." : "Update password"}
          </button>
        </form>
      )}

      {message ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <p className="mt-5 text-sm text-slate-500">
        Need a new link?{" "}
        <Link href="/mover/forgot-password" className="font-semibold text-brandBlue hover:text-indigo-700">
          Request another reset email
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Nav />
      <section className="min-h-screen bg-[linear-gradient(180deg,#edf4fb_0%,#f8fbff_100%)] py-12">
        <div className="container-shell max-w-2xl">
          <Suspense
            fallback={
              <div className="rounded-[32px] border border-white/80 bg-white/85 p-8 shadow-[0_30px_70px_-38px_rgba(15,23,42,0.35)] backdrop-blur">
                <p className="text-sm text-slate-600">Loading reset form...</p>
              </div>
            }
          >
            <ResetPasswordContent />
          </Suspense>
        </div>
      </section>
    </>
  );
}
