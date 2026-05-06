"use client";
import Link from "next/link";
import { Mail, Phone, Send, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SITE_EMAILS, toMailto } from "@/lib/site-emails";
import { FormEvent, useState } from "react";

type ContactForm = {
  name: string;
  email: string;
  message: string;
};

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState<ContactForm>({ name: "", email: "", message: "" });

  async function submitContactMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setStatusMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus("error");
        setStatusMessage(payload?.error?.formErrors?.[0] ?? payload?.error ?? "Please check your details and try again.");
        return;
      }

      if (!payload?.emailSent) {
        setStatus("error");
        setStatusMessage("Your message was saved, but the email notification is not configured yet.");
        return;
      }

      setStatus("sent");
      setStatusMessage("Message sent successfully.");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
      setStatusMessage("Could not send your message. Please try again.");
    }
  }

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(34,197,94,0.12),transparent_18%),linear-gradient(180deg,#506579_0%,#455869_100%)] py-14 text-white sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[6%] top-12 h-36 w-36 rounded-full bg-sky-300/18 blur-3xl sm:h-56 sm:w-56" />
          <div className="absolute right-[10%] top-20 h-40 w-40 rounded-full bg-emerald-300/12 blur-3xl sm:h-60 sm:w-60" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,transparent,rgba(10,17,32,0.08))]" />
        </div>

        <div className="container-shell relative">
          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100 backdrop-blur sm:text-sm">
              <Sparkles className="h-4 w-4" />
              Match &apos;n Move support
            </p>
            <h1 className="mt-5 text-[clamp(2.6rem,8vw,5.25rem)] font-black leading-[0.92] tracking-[-0.05em] text-white">
              Contact us
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
              Questions about quotes, mover partnerships, or how Match &apos;n Move works? Reach out and we&apos;ll point you in the right direction quickly.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-7">
            <div className="min-w-0 w-full overflow-hidden rounded-[30px] border border-white/15 bg-white/[0.08] p-5 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.75)] backdrop-blur-xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-100/80">Get in touch</p>
                  <h2 className="mt-3 text-[clamp(2rem,5vw,3.25rem)] font-black leading-[0.95] tracking-[-0.05em] text-white">
                    Send us a message
                  </h2>
                </div>
                <div className="hidden rounded-2xl border border-white/15 bg-white/10 p-3 text-sky-100 sm:block">
                  <Send className="h-5 w-5" />
                </div>
              </div>

              <form className="mt-6 grid gap-4" onSubmit={submitContactMessage}>
                <div>
                  <label htmlFor="contact-name" className="mb-2 block text-sm font-semibold text-slate-100">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    required
                    minLength={2}
                    className="w-full rounded-2xl border border-white/12 bg-white/95 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="mb-2 block text-sm font-semibold text-slate-100">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    className="w-full rounded-2xl border border-white/12 bg-white/95 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="mb-2 block text-sm font-semibold text-slate-100">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    required
                    minLength={10}
                    className="w-full resize-y rounded-2xl border border-white/12 bg-white/95 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    placeholder="Tell us what you need help with"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f48b39,#e7772d)] px-6 py-3 text-base font-semibold text-white shadow-[0_18px_40px_-24px_rgba(244,139,57,0.9)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_48px_-24px_rgba(244,139,57,1)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 sm:w-auto"
                  >
                    {status === "sending" ? "Sending..." : "Send message"}
                  </button>
                  <p className="text-sm leading-6 text-slate-200/80">We usually reply within 1 business day.</p>
                </div>

                {statusMessage ? (
                  <p className={`text-sm font-semibold ${status === "error" ? "text-orange-100" : "text-emerald-200"}`}>
                    {statusMessage}
                  </p>
                ) : null}
              </form>
            </div>

            <div className="min-w-0 flex flex-col gap-5">
              <div className="min-w-0 overflow-hidden rounded-[30px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] p-6 text-slate-900 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.75)] backdrop-blur-xl sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Contact information</p>
                <h2 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-black leading-[0.95] tracking-[-0.05em] text-slate-950">
                  Talk to the Match &apos;n Move team
                </h2>

                <div className="mt-6 space-y-4">
                  <Link
                    href="tel:+64800123456"
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Call us</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">+64 800 123 456</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">For urgent quote or partnership questions.</p>
                    </div>
                  </Link>

                  <Link
                    href={toMailto(SITE_EMAILS.contact)}
                    className="flex min-w-0 items-start gap-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Email</p>
                      <p className="mt-1 break-all text-lg font-semibold text-slate-950">{SITE_EMAILS.contact}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Best for general help, updates, and follow-up.</p>
                    </div>
                  </Link>

                </div>
              </div>

              <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(145deg,rgba(15,23,42,0.9),rgba(21,38,69,0.95))] p-5 text-white shadow-[0_24px_54px_-30px_rgba(15,23,42,0.75)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Why Match &apos;n Move</p>
                <h3 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em]">Built to connect the right move with the right mover.</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <p className="text-sm font-semibold text-white">Fast quote matching</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">One request, multiple mover options.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <p className="text-sm font-semibold text-white">Verified mover network</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">A cleaner pipeline for trusted companies.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <p className="text-sm font-semibold text-white">People-first support</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">Help for both customers and moving teams.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
