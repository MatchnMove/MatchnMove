import Link from "next/link";
import { Clock3, ShieldCheck, Star } from "lucide-react";
import { ReviewForm } from "@/components/review-form";
import { SiteShell } from "@/components/site-shell";
import { getReviewSurveyState } from "@/lib/reviews";

function formatMoveDate(value: Date | null) {
  if (!value) return "Completed move";

  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function ReviewSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const surveyState = await getReviewSurveyState(token);

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#edf4fb_0%,#f7fafc_34%,#ffffff_100%)] py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[6%] top-12 h-44 w-44 rounded-full bg-sky-200/60 blur-3xl" />
          <div className="absolute right-[7%] top-16 h-56 w-56 rounded-full bg-emerald-100/70 blur-3xl" />
        </div>

        <div className="container-shell relative">
          {surveyState.status === "valid" ? (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(145deg,#081a2b,#102845)] p-6 text-white shadow-[0_28px_80px_-48px_rgba(15,23,42,0.75)] sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                      <ShieldCheck className="h-4 w-4" />
                      Secure one-time survey
                    </p>
                    <h1 className="mt-4 max-w-[12ch] text-[clamp(2.2rem,7vw,4.5rem)] font-black leading-[0.98] tracking-[-0.045em] text-white sm:max-w-[13ch]">
                      Share your verified move experience
                    </h1>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-sky-100/75">Mover</p>
                      <p className="mt-2 font-semibold text-white">{surveyState.invite.moverCompanyName}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-sky-100/75">Route</p>
                      <p className="mt-2 font-semibold text-white">
                        {surveyState.invite.fromCity} to {surveyState.invite.toCity}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-sky-100/75">Move date</p>
                      <p className="mt-2 font-semibold text-white">{formatMoveDate(surveyState.invite.moveDate)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <ReviewForm
                token={token}
                moverCompanyName={surveyState.invite.moverCompanyName}
                customerName={surveyState.invite.customerName}
                routeLabel={`${surveyState.invite.fromCity} to ${surveyState.invite.toCity}`}
              />
            </div>
          ) : (
            <div className="mx-auto max-w-3xl rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_60px_-38px_rgba(15,23,42,0.28)] sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-700">
                {surveyState.status === "expired" ? <Clock3 className="h-7 w-7" /> : <Star className="h-7 w-7" />}
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                {surveyState.status === "expired"
                  ? "This review link has expired"
                  : surveyState.status === "reviewed"
                    ? "This review has already been submitted"
                    : "This review link isn't available"}
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                {surveyState.status === "expired"
                  ? `Your secure review link for ${surveyState.moverCompanyName ?? "this move"} is no longer active.`
                  : surveyState.status === "reviewed"
                    ? `A verified review for ${surveyState.moverCompanyName ?? "this move"} has already been recorded.`
                    : "The secure survey token is invalid or has already been used."}
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/movers"
                  className="inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
                >
                  Browse movers
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
