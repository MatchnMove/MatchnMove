import Image from "next/image";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Hero } from "@/src/components/hero/Hero";
import { ScrollJourneySection } from "@/src/components/home/ScrollJourneySection";

export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <ScrollJourneySection />
      <section className="relative overflow-hidden bg-white py-14 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-8 h-32 w-32 rounded-full bg-emerald-100 blur-3xl sm:h-48 sm:w-48" />
          <div className="absolute right-[10%] top-10 h-40 w-40 rounded-full bg-sky-100/80 blur-3xl sm:h-56 sm:w-56" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(248,250,252,0.85))]" />
        </div>

        <div className="container-shell relative">
          <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#f2fbf7_100%)] shadow-[0_30px_90px_-48px_rgba(15,23,42,0.3)]">
            <div className="grid gap-10 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)] lg:items-center lg:gap-12 lg:px-12 lg:py-12">
              <div className="max-w-[36rem]">
                <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 sm:text-sm">
                  For moving companies
                </p>

                <h3 className="mt-5 max-w-[12ch] text-[clamp(2.2rem,7vw,4.4rem)] font-black leading-[0.94] tracking-[-0.05em] text-slate-950">
                  Turn more quote requests into booked jobs.
                </h3>

                <p className="mt-5 max-w-[34rem] text-[1rem] leading-7 text-slate-600 sm:text-[1.05rem]">
                  Get in front of homeowners already planning a move, respond faster, and only pay for verified leads that match your service area.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">High-intent customers</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Reach movers-ready customers instead of cold traffic.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Flexible lead spend</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">No long contracts, just verified opportunities.</p>
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link
                    href="/about"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-7 py-3 text-base font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.55)]"
                  >
                    Learn more
                  </Link>
                  <p className="max-w-[22rem] text-sm leading-6 text-slate-500">
                    Learn how Match &apos;n Move helps movers grow, then join when you&apos;re ready.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-200/80 pt-6">
                  <div>
                    <p className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">24/7</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400 sm:text-[0.72rem]">Lead flow</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">0</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400 sm:text-[0.72rem]">Lock-in contracts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">1</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400 sm:text-[0.72rem]">Simple dashboard</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-[0_32px_70px_-36px_rgba(15,23,42,0.8)]">
                  <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">Mover partner preview</p>
                      <p className="mt-1 text-sm font-semibold text-white">Live lead dashboard</p>
                    </div>
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                      Verified
                    </div>
                  </div>

                  <Image
                    src="/images/movers/mover-partner-preview.svg"
                    alt="Illustration of a moving company dashboard with incoming leads and scheduled jobs."
                    width={960}
                    height={760}
                    className="h-auto w-full pt-[74px]"
                    priority={false}
                  />

                  <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-slate-900/88 px-4 py-3 shadow-xl backdrop-blur">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-400">This week</p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">12 new leads</p>
                    <p className="mt-1 text-sm text-emerald-300">Qualified requests in your area</p>
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
