import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";
import { getPublicMovers } from "@/lib/public-movers";
import { buildHeroMoverItems } from "@/src/components/hero/hero-mover-data";
import { HomeMoverReviewTicker } from "@/src/components/home/HomeMoverReviewTicker";

export async function MoverReviewsShowcase() {
  const moverItems = buildHeroMoverItems(await getPublicMovers());
  const reviewedMovers = moverItems.filter((mover) => mover.reviewCount > 0);
  const movers = reviewedMovers.length ? reviewedMovers : moverItems;

  if (!movers.length) return null;

  const totalReviews = movers.reduce((sum, mover) => sum + mover.reviewCount, 0);
  const averageRating =
    reviewedMovers.length > 0
      ? reviewedMovers.reduce((sum, mover) => sum + mover.rating, 0) / reviewedMovers.length
      : 0;

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#07111d_0%,#0a1727_48%,#eef4fb_100%)] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.035),transparent_36%,rgba(255,255,255,0.045))]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(420px,1.12fr)] lg:gap-14">
          <div className="hidden lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-200/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
              <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
              Verified mover reviews
            </p>
            <h2 className="mt-5 max-w-[11ch] text-[clamp(3rem,6vw,5rem)] font-black leading-[0.92] tracking-[-0.05em] text-white">
              Compare movers with proof.
            </h2>
            <p className="mt-5 max-w-[35rem] text-base leading-8 text-slate-300">
              Public mover profiles show verified ratings, company details, and customer feedback in one place, so families can choose with more confidence before they book.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <ReviewMetric icon={ShieldCheck} label="Profiles" value={String(movers.length)} />
              <ReviewMetric icon={Star} label="Avg rating" value={averageRating > 0 ? averageRating.toFixed(1) : "New"} />
              <ReviewMetric icon={Sparkles} label="Reviews" value={String(totalReviews)} />
            </div>

            <Link
              href="/movers"
              className="mt-8 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_24px_58px_-36px_rgba(255,255,255,0.7)] transition hover:-translate-y-1 hover:bg-sky-50"
            >
              Browse mover profiles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="lg:justify-self-end">
            <h2 className="sr-only">Verified mover review cards</h2>
            <HomeMoverReviewTicker initialMovers={movers} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewMetric({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
      <Icon className="h-5 w-5 text-sky-100" />
      <p className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    </div>
  );
}
