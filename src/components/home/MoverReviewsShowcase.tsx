import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";
import { getPublicMovers } from "@/lib/public-movers";
import { buildHeroMoverItems } from "@/src/components/hero/hero-mover-data";
import { HomeMoverReviewTicker, type HomeMoverReviewItem } from "@/src/components/home/HomeMoverReviewTicker";

const fallbackMoverReviews: HomeMoverReviewItem[] = [
  {
    id: "fallback-coastal-carry",
    name: "Coastal Carry Co",
    logoUrl: "/images/movers/coastal-carry.svg",
    rating: 4.8,
    reviewCount: 6,
    badge: "Top rated",
    tone: "bg-emerald-500",
    profileHref: "/movers",
    hoverLabel: "Browse profiles",
  },
  {
    id: "fallback-summit-shift",
    name: "Summit Shift Movers",
    logoUrl: "/images/movers/summit-shift.svg",
    rating: 4.8,
    reviewCount: 6,
    badge: "Top rated",
    tone: "bg-blue-500",
    profileHref: "/movers",
    hoverLabel: "Browse profiles",
  },
  {
    id: "fallback-harbourline",
    name: "Harbourline Relocations",
    logoUrl: "/images/movers/harbourline-relocations.svg",
    rating: 4.7,
    reviewCount: 6,
    badge: "Top rated",
    tone: "bg-sky-500",
    profileHref: "/movers",
    hoverLabel: "Browse profiles",
  },
];

export async function MoverReviewsShowcase() {
  const moverItems = buildHeroMoverItems(await getPublicMovers()).map((mover) => ({
    ...mover,
    profileHref: `/movers/${mover.id}`,
  }));
  const reviewedMovers = moverItems.filter((mover) => mover.reviewCount > 0);
  const movers = reviewedMovers.length ? reviewedMovers : moverItems.length ? moverItems : fallbackMoverReviews;

  const ratedMovers = movers.filter((mover) => mover.reviewCount > 0 && mover.rating > 0);
  const totalReviews = movers.reduce((sum, mover) => sum + mover.reviewCount, 0);
  const averageRating =
    ratedMovers.length > 0
      ? ratedMovers.reduce((sum, mover) => sum + mover.rating, 0) / ratedMovers.length
      : 0;

  return (
    <section id="mover-reviews" className="relative border-y border-slate-200 bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
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
            <HomeMoverReviewTicker initialMovers={movers} />
          </div>
        </div>
      </div>
    </section>
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
