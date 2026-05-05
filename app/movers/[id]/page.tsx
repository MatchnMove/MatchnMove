/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, MapPinned, ShieldCheck, Trophy } from "lucide-react";
import { ReviewStars } from "@/components/review-stars";
import { SiteShell } from "@/components/site-shell";
import { PUBLIC_MOVER_DESCRIPTION_FALLBACK } from "@/lib/public-mover-constants";
import { formatServiceAreaLabel } from "@/lib/nz-regions";
import { getPublicMoverProfile, getPublicMovers } from "@/lib/public-movers";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const movers = await getPublicMovers();
  return movers.map((mover) => ({ id: mover.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mover = await getPublicMoverProfile(id);

  if (!mover) {
    return {
      title: "Mover profile | Match 'n Move",
    };
  }

  return {
    title: `${mover.companyName} reviews | Match 'n Move`,
    description: `Read verified customer reviews and rating details for ${mover.companyName} on Match 'n Move.`,
  };
}

export default async function PublicMoverProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mover = await getPublicMoverProfile(id);
  if (!mover) notFound();

  const ratingBreakdown = [
    { label: "5 star", value: mover.fiveStarCount },
    { label: "4 star", value: mover.fourStarCount },
    { label: "3 star", value: mover.threeStarCount },
    { label: "2 star", value: mover.twoStarCount },
    { label: "1 star", value: mover.oneStarCount },
  ];

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#06111f_0%,#081425_34%,#091423_68%,#07101c_100%)] py-12 text-white sm:py-18 lg:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[7%] top-12 h-44 w-44 rounded-full bg-sky-400/10 blur-[120px]" />
          <div className="absolute right-[9%] top-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-[140px]" />
        </div>

        <div className="container-shell relative">
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-6 shadow-[0_40px_100px_-52px_rgba(2,6,23,0.85)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[150px_minmax(0,1fr)_minmax(280px,0.75fr)] lg:items-start">
              <div className="flex h-28 w-28 items-center justify-center rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] p-4 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.72)] sm:h-32 sm:w-32">
                {mover.logoUrl ? (
                  <img src={mover.logoUrl} alt={`${mover.companyName} logo`} className="max-h-full max-w-full object-contain" />
                ) : (
                  <Building2 className="h-10 w-10 text-slate-500" />
                )}
              </div>

              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                  <ShieldCheck className="h-4 w-4" />
                  Verified customer reviews
                </p>
                <h1 className="mt-4 text-[clamp(2.4rem,7vw,4.8rem)] font-black leading-[0.92] tracking-[-0.06em] text-white">
                  {mover.companyName}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-slate-300">
                    <MapPinned className="h-4 w-4 text-sky-200" />
                    {mover.serviceAreas.length ? mover.serviceAreas.map(formatServiceAreaLabel).join(" / ") : "Service area on request"}
                  </span>
                  {typeof mover.yearsOperating === "number" ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-slate-300">
                      {mover.yearsOperating}+ years operating
                    </span>
                  ) : null}
                  {mover.leaderboardEligible ? (
                    <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-100">
                      Ranked on mover leaderboard
                    </span>
                  ) : null}
                </div>
                <p className="mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">
                  {mover.businessDescription || PUBLIC_MOVER_DESCRIPTION_FALLBACK}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">Public rating</p>
                <p className="mt-3 text-[clamp(2.6rem,8vw,4rem)] font-black tracking-[-0.06em] text-white">
                  {mover.averageRating.toFixed(2)}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <ReviewStars rating={mover.averageRating} size="lg" />
                  <span className="text-sm text-slate-300">
                    {mover.totalReviewCount} verified review{mover.totalReviewCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Recommend rate" value={`${Math.round(mover.recommendationRate)}%`} />
                  <MetricCard label="Leaderboard" value={mover.leaderboardEligible ? "Eligible" : "Not yet ranked"} />
                </div>
                <Link
                  href="/quote"
                  className="mt-5 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
                >
                  Request a quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef5fb_0%,#ffffff_100%)] py-12 sm:py-16">
        <div className="container-shell">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.75fr)]">
            <div className="space-y-6">
              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Ratings snapshot</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">What verified customers rated</h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  {ratingBreakdown.map((bucket) => (
                    <div key={bucket.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{bucket.label}</p>
                      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{bucket.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Approved reviews</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">Verified customer feedback</h2>

                <div className="mt-5 space-y-4">
                  {mover.approvedReviews.length ? (
                    mover.approvedReviews.map((review) => (
                      <article key={review.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{review.customerName}</p>
                            <p className="mt-1 text-sm text-slate-500">{review.routeLabel}</p>
                          </div>
                          <div className="text-right">
                            <ReviewStars rating={review.overallRating} />
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(new Date(review.submittedAt))}
                            </p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-slate-600">{review.writtenReview}</p>
                        {review.recommendMover !== null ? (
                          <span className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            {review.recommendMover ? "Would recommend this mover" : "Would not recommend this mover"}
                          </span>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                      <p className="font-semibold text-slate-900">Approved written reviews are on the way</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        Verified star ratings are already counted in this mover&apos;s profile. Written reviews will appear here once customers submit them and moderation is complete.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Service quality</p>
                <div className="mt-5 space-y-3">
                  {[
                    { label: "Communication", value: mover.communicationAverage },
                    { label: "Punctuality", value: mover.punctualityAverage },
                    { label: "Care of belongings", value: mover.careOfBelongingsAverage },
                    { label: "Professionalism", value: mover.professionalismAverage },
                    { label: "Value for money", value: mover.valueForMoneyAverage },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{item.label}</p>
                        <div className="flex items-center gap-3">
                          <ReviewStars rating={item.value} />
                          <span className="text-sm font-semibold text-slate-600">{item.value.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(145deg,#0f172a,#17324f)] p-6 text-white shadow-sm sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Why these reviews are trusted</p>
                <div className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
                  <p>Customers cannot leave ratings from a public open form.</p>
                  <p>Every review is submitted through a unique single-use survey link tied to a completed Match &apos;n Move job.</p>
                  <p>Written reviews are moderated before they appear publicly, keeping the profile clean and trustworthy.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-sky-100/75">{label}</p>
      <p className="mt-2 text-xl font-black tracking-[-0.04em] text-white">{value}</p>
    </div>
  );
}
