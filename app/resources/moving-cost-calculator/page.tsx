import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Info } from "lucide-react";
import { MovingCostCalculator } from "@/components/moving-cost-calculator";
import { SiteShell } from "@/components/site-shell";
import { absoluteUrl, createPageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "NZ Moving Cost Calculator",
  description:
    "Estimate a broad New Zealand moving budget based on route, home size, city, packing, access, heavy items, and timing.",
  path: "/resources/moving-cost-calculator",
});

export default function MovingCostCalculatorPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Resources", item: absoluteUrl("/resources") },
          {
            "@type": "ListItem",
            position: 3,
            name: "Moving cost calculator",
            item: absoluteUrl("/resources/moving-cost-calculator"),
          },
        ],
      },
      {
        "@type": "WebApplication",
        name: "NZ Moving Cost Calculator",
        url: absoluteUrl("/resources/moving-cost-calculator"),
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        description:
          "A free planning tool for estimating a broad New Zealand moving budget before requesting mover quotes.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "NZD",
        },
        provider: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
        },
      },
    ],
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(56,189,248,0.2),transparent_28%),linear-gradient(145deg,#071525,#12345d)] py-12 text-white sm:py-16">
        <div className="container-shell relative">
          <nav aria-label="Breadcrumb" className="text-sm text-sky-100/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <Link href="/resources" className="hover:text-white">Resources</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span>Moving cost calculator</span>
          </nav>
          <div className="mt-7 max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              <Calculator className="h-4 w-4" />
              Free planning tool
            </p>
            <h1 className="mt-5 text-[clamp(2.5rem,8vw,5.2rem)] font-black leading-[0.96] tracking-[-0.05em]">
              NZ moving cost calculator
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">
              Build a broad 2026 moving budget from your route, load size, location, access, timing, and extra services.
              Then request written quotes based on the actual job.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef5fb_0%,#ffffff_100%)] py-10 sm:py-14">
        <div className="container-shell">
          <MovingCostCalculator />

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">How the estimate works</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The calculator starts with broad NZ home-size ranges, then adjusts for route type, selected local
                market, packing, difficult access, specialist items, and busy timing. It rounds the result because
                false precision would be misleading.
              </p>
              <Link
                href="/resources/nz-moving-costs-2026"
                className="mt-5 inline-flex items-center gap-2 font-semibold text-sky-700"
              >
                Read the full cost methodology
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="rounded-[26px] border border-sky-200 bg-sky-50 p-6">
              <div className="flex items-start gap-3">
                <Info className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                <div>
                  <h2 className="text-xl font-bold text-slate-950">What it cannot calculate</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Exact inventory volume, kilometres, depot travel, lift restrictions, parking, ferry schedules,
                    storage, insurance, mover availability, and the final service scope all require a mover to inspect
                    your request.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

