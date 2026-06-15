import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, FileCheck2, ShieldCheck, Wrench } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = createPageMetadata({
  title: "Trusted Moving Companies NZ",
  description:
    "Browse trusted New Zealand moving companies, service areas, ratings, and verified customer reviews before requesting free moving quotes.",
  path: "/movers",
});

export default async function MoversPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,#06111f_0%,#081425_34%,#091423_68%,#07101c_100%)] py-8 text-white sm:py-18 lg:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[7%] top-12 h-44 w-44 rounded-full bg-sky-400/10 blur-[120px]" />
          <div className="absolute right-[9%] top-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-[140px]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
        </div>

        <div className="container-shell relative">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4 shadow-[0_40px_100px_-52px_rgba(2,6,23,0.85)] backdrop-blur-xl sm:rounded-[34px] sm:p-8 lg:p-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100/80 sm:text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  Trusted movers
                </p>
                <h1 className="mt-4 max-w-[12ch] text-[clamp(2.05rem,10vw,5rem)] font-black leading-[0.98] tracking-[-0.035em] text-white sm:mt-5 sm:max-w-none sm:leading-[0.92] sm:tracking-[-0.06em]">
                  Browse trusted movers on Match &apos;n Move
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-5 sm:text-base sm:leading-7">
                  Explore moving companies on the Match &apos;n Move network, learn what each business offers, and get a feel
                  for who you may want to request quotes from before you start comparing pricing.
                </p>
              </div>

              <Link
                href="/quote"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-sky-200/30 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-h-[50px] sm:w-auto sm:rounded-2xl sm:px-6"
              >
                Request quotes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 overflow-hidden rounded-[28px] border border-sky-200/20 bg-[linear-gradient(145deg,rgba(14,116,144,0.18),rgba(255,255,255,0.05))]">
              <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                    <Wrench className="h-4 w-4" />
                    Directory maintenance
                  </div>
                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
                    We&apos;re preparing the mover directory for verified listings.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    The directory is temporarily unavailable while we review and prepare mover profiles. This does not
                    affect moving quote requests: you can safely submit your move details now, and Match &apos;n Move
                    will use them only to help arrange relevant, no-obligation quotes.
                  </p>
                  <Link
                    href="/quote"
                    className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-50"
                  >
                    Request moving quotes
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid gap-3">
                  <MaintenancePoint
                    icon={FileCheck2}
                    title="Your details still work"
                    copy="Quote requests continue to be received and handled through the normal secure process."
                  />
                  <MaintenancePoint
                    icon={ShieldCheck}
                    title="Listings are being checked"
                    copy="Profiles will return only when they are ready for customers to view and compare."
                  />
                  <MaintenancePoint
                    icon={Clock3}
                    title="Temporary interruption"
                    copy="This page will reopen as the verified mover directory is made ready."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function MaintenancePoint({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof ShieldCheck;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sky-300/10 p-2 text-sky-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{copy}</p>
        </div>
      </div>
    </div>
  );
}
