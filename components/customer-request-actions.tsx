"use client";
import { useState } from "react";
export function CustomerRequestActions() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  async function support() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/customer-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "support", message }),
      });
      if (!res.ok) throw Error();
      setStatus(
        "Your correction request has been saved for support review. Submitted details have not changed yet.",
      );
      setMessage("");
    } catch {
      setStatus(
        "Your message could not be saved. Please try again or use the contact page.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function access() {
    try {
      const res = await fetch("/api/customer-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "access" }),
      });
      if (!res.ok) throw Error();
      const data = await res.json();
      setLink(data.url);
    } catch {
      setStatus("A private link could not be created. Try again.");
    }
  }
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 p-6">
      <h2 className="text-2xl font-bold">Need to correct something?</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Send a correction for support review. A provider who has already
        accessed your enquiry may need the updated details directly.
      </p>
      <label className="mt-4 block font-semibold">
        Correction or enquiry
        <textarea
          maxLength={2000}
          minLength={10}
          className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-normal"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <button
        disabled={busy || message.trim().length < 10}
        onClick={() => void support()}
        className="mt-4 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Saving..." : "Send to support"}
      </button>
      <p role="status" className="mt-4 text-sm">
        {status}
      </p>
      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="font-semibold">Return to your request</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This browser can view your request for 30 days. A private link lets
          you return from another device. Anyone with it can view your request,
          so keep it private.
        </p>
        <button
          onClick={() => void access()}
          className="mt-3 min-h-11 text-teal-700 underline"
        >
          Create a private return link
        </button>
        {link && (
          <label className="mt-3 block text-sm">
            Private return link (expires in 30 days)
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3"
            />
          </label>
        )}
      </div>
    </section>
  );
}
