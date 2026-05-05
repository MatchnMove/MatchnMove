import Link from "next/link";
import { Award, Medal, MessageSquareText, ShieldCheck, Star, Trophy } from "lucide-react";
import { ReviewModerationStatus } from "@prisma/client";
import { ReviewStars } from "@/components/review-stars";
import { cx } from "@/lib/utils";

type RatingsPanelProps = {
  ratings: {
    summary: {
      averageRating: number;
      totalReviewCount: number;
      fiveStarCount: number;
      fourStarCount: number;
      threeStarCount: number;
      twoStarCount: number;
      oneStarCount: number;
      communicationAverage: number;
      punctualityAverage: number;
      careOfBelongingsAverage: number;
      professionalismAverage: number;
      valueForMoneyAverage: number;
      recommendationRate: number;
      leaderboardEligible: boolean;
    } | null;
    pendingCount: number;
    recentReviews: Array<{
      id: string;
      overallRating: number;
      writtenReview: string | null;
      recommendMover: boolean | null;
      communicationRating: number | null;
      punctualityRating: number | null;
      careOfBelongingsRating: number | null;
      professionalismRating: number | null;
      valueForMoneyRating: number | null;
      moderationStatus: ReviewModerationStatus;
      isPublic: boolean;
      submittedAt: string;
      customerName: string;
      routeLabel: string;
    }>;
    competition: {
      isRanked: boolean;
      rank: number | null;
      rankedMoverCount: number;
      reviewsNeededToRank: number;
      value: string;
      detail: string;
    };
    leaderboard: Array<{
      id: string;
      companyName: string;
      averageRating: number;
      totalReviewCount: number;
      leaderboardEligible: boolean;
      rank: number | null;
      isCurrentMover: boolean;
    }>;
  };
};

const subRatings = [
  { key: "communicationAverage", label: "Communication" },
  { key: "punctualityAverage", label: "Punctuality" },
  { key: "careOfBelongingsAverage", label: "Care of belongings" },
  { key: "professionalismAverage", label: "Professionalism" },
  { key: "valueForMoneyAverage", label: "Value for money" },
] as const;

export function MoverRatingsPanel({ ratings }: RatingsPanelProps) {
  const summary = ratings.summary;
  const breakdown = summary
    ? [
        { label: "5 star", value: summary.fiveStarCount },
        { label: "4 star", value: summary.fourStarCount },
        { label: "3 star", value: summary.threeStarCount },
        { label: "2 star", value: summary.twoStarCount },
        { label: "1 star", value: summary.oneStarCount },
      ]
    : [];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.92fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(145deg,#081a2b,#102845)] p-5 text-white shadow-sm sm:rounded-[30px] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200 sm:text-sm">Ratings overview</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[clamp(2.6rem,8vw,4.8rem)] font-black tracking-[-0.06em] text-white">
                {summary?.averageRating.toFixed(2) ?? "0.00"}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <ReviewStars rating={summary?.averageRating ?? 0} size="lg" />
                <p className="text-sm text-slate-300">
                  {summary?.totalReviewCount ?? 0} verified review{(summary?.totalReviewCount ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <MetricPill icon={ShieldCheck} label="Public rating" value={summary?.leaderboardEligible ? "Ranked" : "Not yet ranked"} />
              <MetricPill icon={MessageSquareText} label="Pending text reviews" value={String(ratings.pendingCount)} />
              <MetricPill icon={Award} label="Recommend rate" value={`${Math.round(summary?.recommendationRate ?? 0)}%`} />
              <MetricPill
                icon={Star}
                label="Leaderboard rank"
                value={ratings.competition.value}
                meta={ratings.competition.detail}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {breakdown.map((bucket) => (
              <div key={bucket.label} className="rounded-[20px] border border-white/10 bg-white/[0.06] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-sky-100/75">{bucket.label}</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">{bucket.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[30px] sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Sub-ratings</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">Customer experience signals</h2>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {subRatings.map((item) => (
              <div key={item.key} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col items-center gap-3 text-center min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between min-[520px]:text-left">
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <div className="flex items-center justify-center gap-3">
                    <ReviewStars rating={summary?.[item.key] ?? 0} />
                    <span className="text-sm font-semibold text-slate-600">
                      {(summary?.[item.key] ?? 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[30px] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Recent reviews</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">What customers are saying</h2>
            </div>
            <Link
              href="/movers"
              className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View public profiles
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {ratings.recentReviews.length ? (
              ratings.recentReviews.map((review) => (
                <article key={review.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{review.customerName}</p>
                      <p className="mt-1 text-sm text-slate-500">{review.routeLabel}</p>
                    </div>
                    <div className="text-right">
                      <ReviewStars rating={review.overallRating} />
                      <span
                        className={cx(
                          "mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                          review.moderationStatus === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : review.moderationStatus === "REJECTED"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {review.moderationStatus}
                      </span>
                    </div>
                  </div>

                  {review.writtenReview ? (
                    <p className="mt-4 text-sm leading-7 text-slate-600">{review.writtenReview}</p>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Star rating only. No written review was left.</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {review.recommendMover !== null ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {review.recommendMover ? "Would recommend" : "Would not recommend"}
                      </span>
                    ) : null}
                    {review.isPublic ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        Publicly visible
                      </span>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="font-semibold text-slate-900">No reviews yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Reviews will appear here after completed jobs are marked as won and customers submit the secure survey.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[30px] sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <Medal className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-sm">Mover leaderboard</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">How you stack up</h2>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {ratings.leaderboard.map((entry) => (
              <div
                key={entry.id}
                className={cx(
                  "rounded-[22px] border p-4",
                  entry.isCurrentMover ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("font-semibold", entry.isCurrentMover ? "text-white" : "text-slate-900")}>
                      {entry.companyName}
                    </p>
                    <p className={cx("mt-1 text-sm", entry.isCurrentMover ? "text-slate-300" : "text-slate-500")}>
                      {entry.leaderboardEligible ? `Rank #${entry.rank}` : "Not yet ranked"}
                    </p>
                  </div>
                  {entry.rank === 1 ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                      Top performer
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <ReviewStars rating={entry.averageRating} />
                  <p className={cx("text-sm font-semibold", entry.isCurrentMover ? "text-white" : "text-slate-700")}>
                    {entry.averageRating.toFixed(2)} | {entry.totalReviewCount} reviews
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-3">
      <div className="flex items-center gap-2 text-sky-100">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-2 text-lg font-black tracking-[-0.04em] text-white">{value}</p>
      {meta ? <p className="mt-1 text-xs leading-5 text-slate-300">{meta}</p> : null}
    </div>
  );
}
