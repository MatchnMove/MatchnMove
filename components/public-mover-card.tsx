/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, Building2, MapPinned, ShieldCheck } from "lucide-react";
import { ReviewStars } from "@/components/review-stars";
import { PUBLIC_MOVER_DESCRIPTION_FALLBACK } from "@/lib/public-mover-constants";
import { formatServiceAreaLabel } from "@/lib/nz-regions";

export type PublicMoverCardData = {
  id: string;
  companyName: string;
  businessDescription: string | null;
  logoUrl: string | null;
  serviceAreas: string[];
  yearsOperating: number | null;
  averageRating: number;
  totalReviewCount: number;
  leaderboardEligible: boolean;
};

type PublicMoverCardProps = {
  mover: PublicMoverCardData;
};

function getPreviewText(description: string, maxChars: number) {
  if (description.length <= maxChars) return description;

  const sliced = description.slice(0, maxChars);
  const lastSpaceIndex = sliced.lastIndexOf(" ");
  return `${(lastSpaceIndex > Math.floor(maxChars * 0.65) ? sliced.slice(0, lastSpaceIndex) : sliced).trim()}...`;
}

export function PublicMoverCard({ mover }: PublicMoverCardProps) {
  const description = mover.businessDescription || PUBLIC_MOVER_DESCRIPTION_FALLBACK;
  const flattenedDescription = description.replace(/\s+/g, " ");
  const locationLabel = mover.serviceAreas.length > 0 ? mover.serviceAreas.slice(0, 3).map(formatServiceAreaLabel).join(" / ") : "Service area available on request";

  return (
    <article className="group relative self-start overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4 shadow-[0_18px_42px_-34px_rgba(2,6,23,0.78)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-sky-200/20 hover:shadow-[0_28px_60px_-40px_rgba(14,165,233,0.28)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.14),transparent_62%)] blur-2xl" />

      <div className="relative flex flex-col">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] p-2.5 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.7)]">
              {mover.logoUrl ? (
                <img src={mover.logoUrl} alt={`${mover.companyName} logo`} className="max-h-full max-w-full object-contain" />
              ) : (
                <Building2 className="h-6 w-6 text-slate-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black tracking-[-0.04em] text-white">{mover.companyName}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1.5 sm:px-3">
                  <MapPinned className="h-3.5 w-3.5 text-sky-200" />
                  <span>{locationLabel}</span>
                </span>
                {typeof mover.yearsOperating === "number" ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-slate-300">
                    {mover.yearsOperating}+ years operating
                  </span>
                ) : null}
              </div>
            </div>
          </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-3.5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ReviewStars rating={mover.averageRating} />
              <p className="truncate text-sm font-semibold leading-[1.15] text-white [font-variant-numeric:tabular-nums]">
                {mover.averageRating.toFixed(2)}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              {mover.totalReviewCount} review{mover.totalReviewCount === 1 ? "" : "s"}
            </p>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/75">
            {mover.leaderboardEligible ? "Ranked" : "Unranked"}
          </p>
        </div>

        <div className="mt-3 text-sm text-slate-300">
          <p className="leading-6">{getPreviewText(flattenedDescription, 88)}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Link
            href={`/movers/${mover.id}`}
            className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-2xl border border-sky-200/20 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white transition hover:border-sky-200/35 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            View profile
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/quote"
            className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-sky-200/30 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Request quote
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
