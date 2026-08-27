import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";
import { getPublicMovers } from "@/lib/public-movers";
import { buildHeroMoverItems } from "@/src/components/hero/hero-mover-data";
import { HomeMoverReviewTicker } from "@/src/components/home/HomeMoverReviewTicker";

export async function MoverReviewsShowcase() {
  const moverItems = buildHeroMoverItems(await getPublicMovers()).map((mover) => ({
    ...mover,
    profileHref: `/movers/${mover.id}`,
  }));
  const reviewedMovers = moverItems.filter((mover) => mover.reviewCount > 0);
  const movers = reviewedMovers.length ? reviewedMovers : moverItems;

  const ratedMovers = movers.filter((mover) => mover.reviewCount > 0 && mover.rating > 0);
  const totalReviews = movers.reduce((sum, mover) => sum + mover.reviewCount, 0);
  const averageRating =
    ratedMovers.length > 0
      ? ratedMovers.reduce((sum, mover) => sum + mover.rating, 0) / ratedMovers.length
      : 0;

  if (movers.length === 0) {
    return (
      <section data-analytics-section="homepage_mover_proof" className="relative border-y border-slate-200 bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#eff6ff)] p-6 sm:p-9 lg:p-12">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              <ShieldCheck className="h-4 w-4" />
              A safer way to request moving quotes
            </p>
            <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Share your move once. Stay in control of what happens next.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              We use your route and move details to identify relevant moving companies. Requesting quotes is free,
              there is no obligation to book, and your contact details are used only for your quote request.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <TrustPoint icon={ShieldCheck} title="Relevant matching" copy="Your request is shared only for the move you submit." />
              <TrustPoint icon={Sparkles} title="No booking obligation" copy="Compare any responses and decide in your own time." />
              <TrustPoint icon={Star} title="Free for customers" copy="There is no fee to request or compare moving quotes." />
            </div>
            <Link
              href="/quote"
              className="mt-7 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Request free moving quotes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="mover-reviews" data-analytics-section="homepage_mover_proof" className="relative border-y border-slate-200 bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(430px,1fr)] lg:gap-14">
          <div className="hidden lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
              Verified mover reviews
            </p>
            <h2 className="mt-5 max-w-[12ch] text-6xl font-black leading-[0.95] tracking-normal text-slate-950 xl:text-7xl">
              Proof before you pick a mover.
            </h2>
            <p className="mt-5 max-w-[35rem] text-base leading-8 text-slate-600">
              Real ratings, public company details, and profile links sit together in one place, so customers can compare movers with confidence before they request a quote.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <ReviewMetric icon={ShieldCheck} label="Profiles" value={String(movers.length)} />
              <ReviewMetric icon={Star} label="Avg rating" value={averageRating > 0 ? averageRating.toFixed(1) : "New"} />
              <ReviewMetric icon={Sparkles} label="Reviews" value={String(totalReviews)} />
            </div>

            <Link
              href="/movers"
              className="mt-8 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_22px_52px_-32px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
            >
              Browse mover profiles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="min-w-0 w-full max-w-[560px] lg:justify-self-end">
            <h2 className="sr-only">Verified mover review cards</h2>
            {movers.length > 0 ? (
              <HomeMoverReviewTicker initialMovers={movers} />
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-7 shadow-inner sm:p-9">
                <div className="inline-flex rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  The mover review board is temporarily under maintenance.
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  We&apos;re reviewing the profiles and feedback shown here. You can still submit your move details
                  securely to request free, no-obligation quotes while this section is being prepared.
                </p>
                <Link
                  href="/quote"
                  className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  Request moving quotes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustPoint({ icon: Icon, title, copy }: { icon: typeof ShieldCheck; title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white/80 p-5 shadow-sm">
      <Icon className="h-5 w-5 text-sky-700" />
      <p className="mt-4 font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
    </div>
  );
}

function ReviewMetric({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-sky-700" />
      <p className="mt-4 text-2xl font-black tracking-normal text-slate-950">{value}</p>
      <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    </div>
  );
}
