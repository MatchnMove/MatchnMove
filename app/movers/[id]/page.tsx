/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { ReviewStars } from "@/components/review-stars";
import { SiteShell } from "@/components/site-shell";
import { ReviewActions } from "@/components/review-actions";
import { formatServiceAreaLabel } from "@/lib/nz-regions";
import { getPublicMoverProfile } from "@/lib/public-movers";
import { createPageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const mover = await getPublicMoverProfile((await params).id);
  return mover
    ? createPageMetadata({
        title: mover.companyName + " | Moving Services & Customer Reviews",
        description:
          "View company-supplied services and coverage for " +
          mover.companyName +
          ", recorded profile checks and available customer reviews.",
        path: "/movers/" + mover.id,
      })
    : { title: "Mover profile", robots: { index: false, follow: false } };
}
export default async function Profile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const mover = await getPublicMoverProfile((await params).id);
  if (!mover) notFound();
  return (
    <SiteShell>
      <main className="container-shell max-w-5xl py-12 sm:py-16">
        <Link href="/movers" className="font-semibold text-teal-700 underline">
          All moving companies
        </Link>
        <header className="mt-7 rounded-3xl bg-slate-950 p-6 text-white sm:p-10">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white p-3">
              {mover.logoUrl ? (
                <img
                  src={mover.logoUrl}
                  alt={mover.companyName + " logo"}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <Building2 className="text-slate-500" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                {mover.companyName}
              </h1>
              <p className="mt-3 text-slate-300">
                {mover.operatingRegion
                  ? formatServiceAreaLabel(mover.operatingRegion)
                  : "Operating location not supplied"}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {mover.trustLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-teal-300/40 px-3 py-2 text-sm text-teal-100"
              >
                {label}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-300">
            Checks relate to the specific information labelled above. Services
            and coverage are supplied by the company.{" "}
            <Link href="/trust" className="underline">
              Understand profile checks
            </Link>
            .
          </p>
        </header>
        <div className="mt-9 grid gap-10 md:grid-cols-[1.6fr_1fr]">
          <div>
            <section>
              <h2 className="text-2xl font-bold">About the company</h2>
              <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">
                {mover.businessDescription ||
                  "This company has not supplied a business description yet. Ask about their experience, equipment and suitability for your move."}
              </p>
              {mover.yearsOperating !== null && (
                <p className="mt-4 text-slate-600">
                  {mover.yearsOperating} years operating &middot;
                  operating-history evidence reviewed.
                </p>
              )}
            </section>
            <section className="mt-9">
              <h2 className="text-2xl font-bold">Services &amp; coverage</h2>
              <p className="mt-3 leading-7 text-slate-600">
                {mover.movingServices.length
                  ? mover.movingServices.join(" \u00b7 ")
                  : "Service categories have not been supplied. Confirm your requirements with the company."}
              </p>
              <p className="mt-3 leading-7 text-slate-600">
                {mover.serviceAreas
                  .map(formatServiceAreaLabel)
                  .join(" \u00b7 ") || "Coverage available on request"}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Coverage does not guarantee availability for a specific route or
                date.
              </p>
            </section>
          </div>
          <aside className="self-start rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-bold">Compare your options</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Submit a free request to be matched by service area. A directory
              profile does not reserve this company or guarantee it will
              respond.
            </p>
            <Link
              href="/quote"
              className="mt-5 block rounded-xl bg-teal-700 px-5 py-3 text-center font-semibold text-white"
            >
              Get moving quotes
            </Link>
            <Link
              href="/mover/dashboard?section=profile"
              className="mt-4 block py-2 text-sm text-teal-700 underline"
            >
              Own this business? Complete your profile
            </Link>
          </aside>
        </div>
        <section id="reviews" className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-bold">Customer reviews</h2>
          {mover.totalReviewCount > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ReviewStars rating={mover.averageRating} />
              <p>
                {mover.averageRating.toFixed(1)} / 5 from{" "}
                {mover.totalReviewCount} approved reviews
              </p>
            </div>
          ) : (
            <p className="mt-4 text-slate-600">
              New to Match &apos;n Move. No customer reviews yet.
            </p>
          )}
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Reviews are linked to a genuine platform enquiry. This association
            is not independent proof of a completed move.{" "}
            <Link href="/trust" className="underline">
              How reviews work
            </Link>
            .
          </p>
          <div className="mt-6 space-y-5">
            {mover.approvedReviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <ReviewStars rating={review.overallRating} />
                <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">
                  {review.writtenReview}
                </p>
                <p className="mt-4 text-sm text-slate-500">
                  {review.customerName} ?{" "}
                  {new Date(review.submittedAt).toLocaleDateString("en-NZ")}
                </p>
                {review.providerResponse && (
                  <div className="mt-4 border-l-2 border-teal-600 pl-4">
                    <p className="text-sm font-semibold">
                      Response from {mover.companyName}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-slate-600">
                      {review.providerResponse}
                    </p>
                  </div>
                )}
                <ReviewActions reviewId={review.id} />
              </article>
            ))}
          </div>
        </section>
        <section className="mt-12 rounded-2xl bg-slate-50 p-6">
          <h2 className="text-2xl font-bold">Before you book</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Ask what is included, whether access or heavy items change the
            price, and what insurance cover and cancellation terms apply. Quotes
            and bookings are agreed directly with the provider.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block py-2 font-semibold text-teal-700 underline"
          >
            Report incorrect company information
          </Link>
        </section>
      </main>
    </SiteShell>
  );
}
