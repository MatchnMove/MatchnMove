"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MoverAccountActions({ email, emailVerified }: { email: string; emailVerified: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"verify" | "logout" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function resendVerification() {
    setSubmitting("verify");
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/mover/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(payload.error || "Could not resend verification email.");
        return;
      }

      setMessage(payload.message || "Verification email sent.");
    } finally {
      setSubmitting(null);
    }
  }

  async function logout() {
    setSubmitting("logout");
    setMessage("");
    setError("");

    try {
      await fetch("/api/mover/logout", { method: "POST" });
      router.push("/mover/login");
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-3">
      {!emailVerified ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <p className="font-semibold">Email verification pending</p>
          <p className="mt-1 leading-6">Verify {email} to fully secure your mover account and make recovery easier.</p>
          <button
            type="button"
            onClick={resendVerification}
            disabled={submitting === "verify"}
            className="mt-3 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-70"
          >
            {submitting === "verify" ? "Sending..." : "Resend verification email"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="font-semibold">Email verified</p>
          <p className="mt-1 leading-6">Your account is confirmed and ready to operate normally.</p>
        </div>
      )}

      {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="button"
        onClick={logout}
        disabled={submitting === "logout"}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-70"
      >
        {submitting === "logout" ? "Signing out..." : "Log out"}
      </button>
    </div>
  );
}
