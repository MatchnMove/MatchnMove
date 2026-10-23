"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";

export function TeamActivation({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/recruitment/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...(password ? { password } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setDone(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Account setup failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm">
        <p className="font-bold text-teal-700">Match &apos;n Move · Team</p>
        <h1 className="mt-3 text-3xl font-black">Your workspace awaits</h1>
        {done ? (
          <p className="mt-5">
            Your account is ready.{" "}
            <Link
              className="font-bold text-teal-700 underline"
              href="/mover/login?mode=login&next=/admin/recruitment"
            >
              Sign in and set up your authenticator
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <p className="text-sm text-slate-600">
              New team members choose a personal password. Existing account
              holders must sign in first; their password and account data are
              preserved.
            </p>
            <label className="block text-sm font-bold">
              New account password
              <input
                className="mt-2 w-full rounded-xl border p-3"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              disabled={busy || !token}
              className="w-full rounded-xl bg-teal-700 p-3 font-bold text-white disabled:opacity-50"
            >
              {busy ? "Setting up…" : "Accept invitation"}
            </button>
            <Link
              className="block text-sm text-teal-700 underline"
              href={`/mover/login?mode=login&next=${encodeURIComponent(`/admin/accept-invitation?token=${token}`)}`}
            >
              I already have an account — sign in first
            </Link>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
