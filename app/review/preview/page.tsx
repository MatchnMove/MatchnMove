import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ReviewForm } from "@/components/review-form";
import { SiteShell } from "@/components/site-shell";

export default function ReviewPreviewPage() {
  const moverCompanyName = "North Harbour Movers";
  const customerName = "Jamie Wilson";
  const routeLabel = "Auckland to Hamilton";

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#edf4fb_0%,#f7fafc_34%,#ffffff_100%)] py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[6%] top-12 h-44 w-44 rounded-full bg-sky-200/60 blur-3xl" />
          <div className="absolute right-[7%] top-16 h-56 w-56 rounded-full bg-emerald-100/70 blur-3xl" />
        </div>

        <div className="container-shell relative space-y-6">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(145deg,#081a2b,#102845)] p-6 text-white shadow-[0_28px_80px_-48px_rgba(15,23,42,0.75)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                  <ShieldCheck className="h-4 w-4" />
                  Review form preview
                </p>
                <h1 className="mt-4 max-w-[12ch] text-[clamp(2.2rem,7vw,4.5rem)] font-black leading-[0.98] tracking-[-0.045em] text-white sm:max-w-[13ch]">
                  Share your verified move experience
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/85 sm:text-base">
                  This is a safe preview of the secure post-move review screen. You can click through the form and submit
                  it without creating a real review.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-100/75">Mover</p>
                  <p className="mt-2 font-semibold text-white">{moverCompanyName}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-100/75">Route</p>
                  <p className="mt-2 font-semibold text-white">{routeLabel}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-100/75">Mode</p>
                  <p className="mt-2 font-semibold text-white">Preview only</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link
              href={`/review/submitted?mover=${encodeURIComponent(moverCompanyName)}&status=APPROVED`}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-slate-700 transition hover:bg-slate-50"
            >
              View approved thank-you
            </Link>
            <Link
              href={`/review/submitted?mover=${encodeURIComponent(moverCompanyName)}&status=PENDING`}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-slate-700 transition hover:bg-slate-50"
            >
              View pending thank-you
            </Link>
            <Link
              href={`/review/submitted?mover=${encodeURIComponent(moverCompanyName)}&status=REJECTED`}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-slate-700 transition hover:bg-slate-50"
            >
              View rejected thank-you
            </Link>
          </div>

          <ReviewForm
            token="preview-token"
            moverCompanyName={moverCompanyName}
            customerName={customerName}
            routeLabel={routeLabel}
            previewMode
          />
        </div>
      </section>
    </SiteShell>
  );
}
