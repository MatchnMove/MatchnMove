import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckSquare2,
  FileSearch,
  MapPinned,
  Route,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { resourceCards } from "@/lib/moving-resources";
import { absoluteUrl, createPageMetadata, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "NZ Moving Guides, Costs and Calculator",
  description:
    "Use practical New Zealand moving guides, 2026 cost estimates, city price guides, an interactive calculator, checklists, and quote-comparison advice.",
  path: "/resources",
});

const resourceIcons = {
  "nz-moving-costs-2026": WalletCards,
  "moving-cost-calculator": Calculator,
  "auckland-moving-costs": MapPinned,
  "wellington-moving-costs": MapPinned,
  "christchurch-moving-costs": MapPinned,
  "inter-island-moving-guide": Route,
  "moving-house-checklist": CheckSquare2,
  "compare-moving-quotes": FileSearch,
  "case-studies": Sparkles,
} as const;

export default function ResourcesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "New Zealand moving resources",
    description:
      "Moving cost guides, calculators, checklists, city guides, and quote-comparison advice from Match 'n Move.",
    url: absoluteUrl("/resources"),
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
    },
    hasPart: resourceCards.map((resource) => ({
      "@type": "WebPage",
      name: resource.title,
      url: absoluteUrl(`/resources/${resource.slug}`),
    })),
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(34,197,94,0.16),transparent_24%),linear-gradient(145deg,#071525,#12345d)] py-12 text-white sm:py-16 lg:py-20">
        <div className="container-shell relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            <Sparkles className="h-4 w-4" />
            Match &apos;n Move resources
          </p>
          <h1 className="mt-5 max-w-[14ch] text-[clamp(2.6rem,9vw,5.6rem)] font-black leading-[0.95] tracking-[-0.055em] text-white">
            Plan your move with clearer numbers and better questions.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">
            Explore practical New Zealand moving-cost guidance, city-specific planning, an interactive budget
            calculator, a complete checklist, and a framework for comparing quotes on equal terms.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/resources/moving-cost-calculator"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950"
            >
              Estimate your moving budget
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/quote"
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] px-6 py-3 font-semibold text-white"
            >
              Request actual quotes
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef5fb_0%,#ffffff_100%)] py-12 sm:py-16">
        <div className="container-shell">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {resourceCards.map((resource) => {
              const Icon = resourceIcons[resource.slug as keyof typeof resourceIcons] ?? FileSearch;
              const isCaseStudies = resource.slug === "case-studies";

              return (
                <article
                  key={resource.slug}
                  className="group flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_26px_60px_-40px_rgba(15,23,42,0.38)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {isCaseStudies ? "Verified only" : resource.readTime}
                    </span>
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{resource.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{resource.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{resource.description}</p>
                  <Link
                    href={`/resources/${resource.slug}`}
                    className="mt-6 inline-flex items-center gap-2 font-semibold text-sky-700 transition group-hover:text-sky-800"
                  >
                    {isCaseStudies ? "See publication standard" : "Read resource"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

