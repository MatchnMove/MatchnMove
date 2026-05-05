"use client";

import { FormEvent, useState, useTransition } from "react";
import { CheckCircle2, ChevronRight, LoaderCircle, ShieldCheck, Star, UserRound, UserRoundX, X } from "lucide-react";
import { ReviewStars } from "@/components/review-stars";
import { cx } from "@/lib/utils";

type ReviewFormProps = {
  token: string;
  moverCompanyName: string;
  customerName: string;
  routeLabel: string;
  previewMode?: boolean;
  previewModerationStatus?: "APPROVED" | "PENDING" | "REJECTED";
};

const subRatingFields = [
  { key: "communicationRating", label: "Communication" },
  { key: "punctualityRating", label: "Punctuality" },
  { key: "careOfBelongingsRating", label: "Care of belongings" },
  { key: "professionalismRating", label: "Professionalism" },
  { key: "valueForMoneyRating", label: "Value for money" },
] as const;

export function ReviewForm({
  token,
  moverCompanyName,
  customerName,
  routeLabel,
  previewMode = false,
  previewModerationStatus = "APPROVED",
}: ReviewFormProps) {
  const [overallRating, setOverallRating] = useState<number>(5);
  const [writtenReview, setWrittenReview] = useState("");
  const [recommendMover, setRecommendMover] = useState<"yes" | "no" | "">("");
  const hasRecommendationChoice = recommendMover !== "";
  const [isSubmitChoiceOpen, setIsSubmitChoiceOpen] = useState(false);
  const [subRatings, setSubRatings] = useState<Record<(typeof subRatingFields)[number]["key"], number | null>>({
    communicationRating: null,
    punctualityRating: null,
    careOfBelongingsRating: null,
    professionalismRating: null,
    valueForMoneyRating: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openSubmitChoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setIsSubmitChoiceOpen(true);
  }

  function submitReview(showReviewerName: boolean) {
    setError(null);
    setIsSubmitChoiceOpen(false);
    startTransition(async () => {
      if (previewMode) {
        const thankYouUrl = new URL("/review/submitted", window.location.origin);
        thankYouUrl.searchParams.set("mover", moverCompanyName);
        thankYouUrl.searchParams.set("status", previewModerationStatus);
        window.location.href = thankYouUrl.toString();
        return;
      }

      const response = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          overallRating,
          writtenReview,
          recommendMover,
          showReviewerName,
          ...subRatings,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; moverCompanyName?: string; moderationStatus?: string }
        | null;
      if (!response.ok) {
        setError(data?.error ?? "Could not submit your review.");
        return;
      }

      const thankYouUrl = new URL("/review/submitted", window.location.origin);
      thankYouUrl.searchParams.set("mover", data?.moverCompanyName ?? moverCompanyName);
      if (typeof data?.moderationStatus === "string") {
        thankYouUrl.searchParams.set("status", data.moderationStatus);
      }
      window.location.href = thankYouUrl.toString();
    });
  }

  return (
    <>
      <form onSubmit={openSubmitChoice} className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_56px_-36px_rgba(15,23,42,0.35)] backdrop-blur sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                <ShieldCheck className="h-4 w-4" />
                Verified customer review
              </p>
              <h1 className="mt-4 text-[clamp(2.1rem,6vw,4rem)] font-black leading-[0.94] tracking-[-0.06em] text-slate-950">
                How did {moverCompanyName} do?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                This secure survey is tied to your completed {routeLabel} move. Your star rating helps power verified customer ratings on Match &apos;n Move.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reviewer</p>
              <p className="mt-2 text-lg font-black tracking-[-0.04em] text-slate-950">{customerName}</p>
              <p className="mt-1 text-sm text-slate-500">{routeLabel}</p>
              <p className="mt-2 max-w-[18rem] text-xs leading-6 text-slate-500">
                You&apos;ll choose at submit whether your name appears on the finished review or stays anonymous.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.8fr)]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Overall rating</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOverallRating(value)}
                    className={cx(
                      "flex h-14 w-14 items-center justify-center rounded-2xl border transition sm:h-16 sm:w-16",
                      overallRating >= value
                        ? "border-amber-200 bg-amber-50 text-amber-500 shadow-[0_16px_36px_-24px_rgba(245,158,11,0.6)]"
                        : "border-slate-200 bg-slate-50 text-slate-300 hover:border-slate-300 hover:text-slate-500",
                    )}
                    aria-label={`Give ${value} stars`}
                  >
                    <Star className={cx("h-6 w-6", overallRating >= value ? "fill-amber-400" : "")} />
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <ReviewStars rating={overallRating} size="lg" />
              <p className="text-lg font-semibold text-slate-700">{overallRating} out of 5</p>
            </div>

            <section className="mt-8 rounded-[28px] border border-slate-200 bg-[linear-gradient(145deg,#081a2b,#102845)] p-6 text-white shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-200">Recommendation</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { value: "yes", label: "Yes, I would recommend them" },
                  { value: "no", label: "No, I would not recommend them" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRecommendMover(option.value as "yes" | "no")}
                    className={cx(
                      "rounded-[22px] border px-4 py-4 text-left text-sm font-semibold transition",
                      recommendMover === option.value
                        ? "border-white bg-white text-slate-950"
                        : "border-white/15 bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-sm leading-7 text-slate-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" />
                  <p>
                    Ratings are only accepted through this one-time secure link. Written feedback may be moderated before it appears publicly.
                  </p>
                </div>
              </div>
            </section>

            {hasRecommendationChoice ? (
              <label className="mt-8 block">
                <span className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Written review</span>
                <textarea
                  value={writtenReview}
                  onChange={(event) => setWrittenReview(event.target.value)}
                  rows={6}
                  maxLength={2000}
                  placeholder="Share anything customers should know about the move. This part is optional and will be checked before it appears publicly."
                  className="mt-3 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                />
                <span className="mt-2 block text-xs text-slate-500">{writtenReview.length}/2000 characters</span>
              </label>
            ) : null}
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Optional detail ratings</p>
              <div className="mt-4 space-y-4">
                {subRatingFields.map((field) => (
                  <div key={field.key} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{field.label}</p>
                      <ReviewStars rating={subRatings[field.key] ?? 0} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const value = index + 1;
                        const selected = subRatings[field.key] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setSubRatings((current) => ({
                                ...current,
                                [field.key]: current[field.key] === value ? null : value,
                              }))
                            }
                            className={cx(
                              "rounded-full border px-3 py-2 text-sm font-semibold transition",
                              selected
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                            )}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {previewMode ? (
          <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
            Preview mode is on. Submitting this form will not save a review.
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Submitted ratings are verified against your completed move and cannot be edited from a public form.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] disabled:opacity-60"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            Submit verified review
          </button>
        </div>
      </form>

      {isSubmitChoiceOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_32px_90px_-40px_rgba(15,23,42,0.55)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Name visibility</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">Choose how your review appears</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Your review remains verified either way. Choose whether your name is shown on the submitted review card.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSubmitChoiceOpen(false)}
                disabled={isPending}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-60"
                aria-label="Close name visibility options"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => submitReview(true)}
                disabled={isPending}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-white disabled:opacity-60"
              >
                <div className="flex items-center gap-3 text-slate-950">
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Show my name</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{customerName}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Your review will display your name beside your rating and written feedback.
                </p>
              </button>

              <button
                type="button"
                onClick={() => submitReview(false)}
                disabled={isPending}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-white disabled:opacity-60"
              >
                <div className="flex items-center gap-3 text-slate-950">
                  <div className="rounded-2xl bg-slate-200 p-3 text-slate-700">
                    <UserRoundX className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Submit anonymously</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Shown as Anonymous reviewer</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Your review still counts as verified, but your name will be hidden after submission.
                </p>
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                This setting only changes how the reviewer name is displayed.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitChoiceOpen(false)}
                disabled={isPending}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
