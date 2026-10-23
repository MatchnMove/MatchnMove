"use client";
import { useState } from "react";
export function ReviewActions({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/reviews/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, reason }),
      });
      if (!r.ok) throw Error();
      setStatus("Report received for moderation.");
      setOpen(false);
      setReason("");
    } catch {
      setStatus("Report could not be sent. Try again or contact support.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="min-h-11 text-sm text-slate-600 underline"
      >
        Report this review
      </button>
      {open && (
        <div>
          <label className="block text-sm">
            Reason for reporting (no personal details)
            <textarea
              maxLength={1000}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            disabled={busy || reason.trim().length < 10}
            onClick={() => void submit()}
            className="mt-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Submit report
          </button>
        </div>
      )}
      <p role="status" className="mt-2 text-sm">
        {status}
      </p>
    </div>
  );
}
