/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import { ReviewStars } from "@/components/review-stars";
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
  isVerifiedProfile: boolean;
  trustLabels?: string[];
  operatingRegion?: string | null;
  movingServices?: string[];
};
export function PublicMoverCard({ mover }: { mover: PublicMoverCardData }) {
  return (
    <article className="self-start rounded-2xl border border-white/15 bg-white/5 p-5 text-white">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white p-2">
          {mover.logoUrl ? (
            <img
              loading="lazy"
              src={mover.logoUrl}
              alt={mover.companyName + " logo"}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Building2 className="text-slate-500" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">{mover.companyName}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {mover.operatingRegion
              ? formatServiceAreaLabel(mover.operatingRegion)
              : "Operating location not supplied"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {mover.trustLabels?.map((label) => (
          <span
            key={label}
            className="rounded-full border border-teal-300/30 px-3 py-1 text-xs text-teal-100"
          >
            {label}
          </span>
        ))}
      </div>
      <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-300">
        <MapPin size={18} className="mt-1 shrink-0" />
        {mover.serviceAreas.length
          ? mover.serviceAreas
              .slice(0, 4)
              .map(formatServiceAreaLabel)
              .join(" \u00b7 ")
          : "Ask the company about coverage"}
      </p>
      {mover.yearsOperating !== null && (
        <p className="mt-3 text-sm text-slate-300">
          {mover.yearsOperating} years operating &middot; evidence reviewed
        </p>
      )}
      {mover.totalReviewCount > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ReviewStars rating={mover.averageRating} />
          <span>
            {mover.averageRating.toFixed(1)} / 5 &middot;{" "}
            {mover.totalReviewCount}{" "}
            {mover.totalReviewCount === 1 ? "review" : "reviews"}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-300">
          New to Match &apos;n Move &middot; no customer reviews yet
        </p>
      )}
      <p className="mt-4 min-h-12 text-sm leading-6 text-slate-300">
        {mover.businessDescription
          ? mover.businessDescription.replace(/\s+/g, " ").slice(0, 170) +
            (mover.businessDescription.length > 170 ? "..." : "")
          : "This company has not supplied a business description yet."}
      </p>
      {Boolean(mover.movingServices?.length) && (
        <p className="mt-3 text-sm text-teal-100">
          {mover.movingServices?.slice(0, 3).join(" \u00b7 ")}
        </p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href={"/movers/" + mover.id}
          className="flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-3 py-3 text-sm font-semibold"
        >
          View profile
        </Link>
        <Link
          href="/quote"
          className="flex min-h-11 items-center justify-center rounded-xl bg-teal-300 px-3 py-3 text-sm font-semibold text-slate-950"
        >
          Request quotes
        </Link>
      </div>
    </article>
  );
}
