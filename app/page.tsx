import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Hero } from "@/src/components/hero/Hero";
import { MoverReviewsShowcase } from "@/src/components/home/MoverReviewsShowcase";
import { MobileQuoteCta } from "@/src/components/home/MobileQuoteCta";
import { MovingQuotesSeoSection } from "@/src/components/home/MovingQuotesSeoSection";
import { ResourceHighlights } from "@/src/components/home/ResourceHighlights";
import { ScrollJourneySection } from "@/src/components/home/ScrollJourneySection";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Free Moving & Cleaning Quotes NZ | Match 'n Move",
  description:
    "Request moving quotes from New Zealand companies. Add optional move-out or move-in cleaning, plan your inventory and compare your options without obligation.",
  path: "/",
});
export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <ScrollJourneySection />
      <MoverReviewsShowcase />
      <MovingQuotesSeoSection />
      <ResourceHighlights />
      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="container-shell grid gap-8 md:grid-cols-2">
          <div>
            <p className="font-semibold text-teal-700">
              For moving and cleaning companies
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Meet customers planning their next move.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Register, set your service areas and review relevant enquiries.
              See the price before choosing to unlock customer details. Enquiry
              volume and bookings are not guaranteed.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <Link
              className="rounded-xl bg-teal-700 px-5 py-3 text-center font-semibold text-white"
              href="/mover/pricing"
            >
              Mover pricing &amp; how it works
            </Link>
            <Link
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-900"
              href="/cleaner/partner"
            >
              Information for cleaning companies
            </Link>
          </div>
        </div>
      </section>
      <MobileQuoteCta />
    </SiteShell>
  );
}
