import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PublicMoversDirectory } from "@/components/public-movers-directory";
import { SiteShell } from "@/components/site-shell";
import { getPublicMovers } from "@/lib/public-movers";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Trusted Movers | Match 'n Move",
  description: "Browse trusted movers on Match 'n Move and learn more about each moving company before requesting quotes.",
};

export default async function MoversPage() {
  const movers = await getPublicMovers();

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,#06111f_0%,#081425_34%,#091423_68%,#07101c_100%)] py-10 text-white sm:py-18 lg:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[7%] top-12 h-44 w-44 rounded-full bg-sky-400/10 blur-[120px]" />
          <div className="absolute right-[9%] top-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-[140px]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
        </div>

        <div className="container-shell relative">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4 shadow-[0_40px_100px_-52px_rgba(2,6,23,0.85)] backdrop-blur-xl sm:rounded-[34px] sm:p-8 lg:p-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100/80 sm:text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  Trusted movers
                </p>
                <h1 className="mt-4 max-w-[10ch] text-[clamp(2.25rem,10vw,5rem)] font-black leading-[0.92] tracking-[-0.06em] text-white sm:mt-5 sm:max-w-none">
                  Browse trusted movers on Match &apos;n Move
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-5 sm:text-base sm:leading-7">
                  Explore moving companies on the Match &apos;n Move network, learn what each business offers, and get a feel
                  for who you may want to request quotes from before you start comparing pricing.
                </p>
              </div>

              <Link
                href="/quote"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-sky-200/30 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-h-[50px] sm:px-6"
              >
                Request quotes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {movers.length > 0 ? (
              <PublicMoversDirectory movers={movers} />
            ) : (
              <div className="mt-10 rounded-[28px] border border-dashed border-white/14 bg-white/[0.05] px-6 py-10 text-center">
                <p className="text-lg font-semibold text-white">Trusted mover profiles are on the way.</p>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  We don&apos;t have any publicly visible mover profiles to show right now. Check back soon or request
                  quotes directly and we&apos;ll help connect you with available movers.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
