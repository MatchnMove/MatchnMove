import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleHelp, Home, KeyRound, MapPinned, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { CLEANING_REGION_CONTENT } from "@/lib/cleaning-regions";
import { NZ_SERVICE_AREA_LOCALITIES, NZ_SERVICE_AREAS } from "@/lib/nz-regions";
import { absoluteUrl, createPageMetadata, getRegionFromSlug, SITE_NAME, SITE_URL, toRegionSlug } from "@/lib/seo";

const commonScope = [
  "Confirm the exact rooms and whether the property will be empty, partly furnished, or occupied.",
  "List extras such as the oven, carpets, inside cupboards, interior windows, walls, balconies, or garage.",
  "Ask whether products, equipment, parking, travel, rubbish removal, and GST are included.",
  "Agree on access, the completion deadline, a final walkthrough, and how additional work would be approved.",
] as const;

const relatedGuides = [
  {
    slug: "end-of-tenancy-cleaning-nz-guide",
    title: "End of tenancy cleaning NZ guide",
    copy: "Define the scope and coordinate a reliable property handover.",
  },
  {
    slug: "move-out-cleaning-checklist-nz",
    title: "Move-out cleaning checklist",
    copy: "Work through preparation, rooms, and final checks in a sensible order.",
  },
  {
    slug: "end-of-tenancy-cleaning-costs-nz",
    title: "End of tenancy cleaning costs",
    copy: "Understand the property and scope details that influence a cleaner's price.",
  },
  {
    slug: "compare-cleaning-quotes",
    title: "How to compare cleaning quotes",
    copy: "Compare inclusions, assumptions, timing, and price on the same basis.",
  },
] as const;

export function generateStaticParams() {
  return NZ_SERVICE_AREAS.map((region) => ({ region: toRegionSlug(region) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region: slug } = await params;
  const region = getRegionFromSlug(slug);

  if (!region) {
    return createPageMetadata({
      title: "Move-Out Cleaning Quotes NZ",
      description: "Compare free move-out cleaning quotes while organising your New Zealand move.",
      path: `/cleaning-quotes/${slug}`,
      noIndex: true,
    });
  }

  const content = CLEANING_REGION_CONTENT[region];
  return createPageMetadata({
    title: `Free Move-Out Cleaning Quotes ${region}`,
    description: `Request free move-out and end-of-tenancy cleaning quotes in ${region}. Practical guidance for ${content.metaFocus}. No obligation to book.`,
    path: `/cleaning-quotes/${toRegionSlug(region)}`,
  });
}

export default async function RegionalCleaningQuotesPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region: slug } = await params;
  const region = getRegionFromSlug(slug);
  if (!region) notFound();

  const content = CLEANING_REGION_CONTENT[region];
  const localities = NZ_SERVICE_AREA_LOCALITIES[region];
  const path = `/cleaning-quotes/${toRegionSlug(region)}`;
  const pageUrl = absoluteUrl(path);
  const otherRegions = NZ_SERVICE_AREAS.filter((item) => item !== region).slice(0, 7);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Cleaning quotes", item: absoluteUrl("/cleaning-quotes") },
          { "@type": "ListItem", position: 3, name: `${region} cleaning quotes`, item: pageUrl },
        ],
      },
      {
        "@type": "Service",
        name: `Move-out cleaning quote comparison in ${region}`,
        description: `Request move-out and end-of-tenancy cleaning quotes for a pickup property in ${region}, New Zealand.`,
        url: pageUrl,
        serviceType: "Move-out cleaning quote comparison",
        provider: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: SITE_URL,
        },
        areaServed: { "@type": "AdministrativeArea", name: `${region}, New Zealand` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "NZD",
          description: "Free for customers to request cleaning quotes; no obligation to book.",
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

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(249,115,22,0.14),transparent_24%),linear-gradient(145deg,#071525,#12345d)] py-12 text-white sm:py-16 lg:py-20">
        <div className="container-shell relative">
          <nav aria-label="Breadcrumb" className="text-sm text-sky-100/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <Link href="/cleaning-quotes" className="hover:text-white">Cleaning quotes</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span>{region}</span>
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.72fr)] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                <MapPinned className="h-4 w-4" />
                {region}, New Zealand
              </p>
              <h1 className="mt-5 max-w-[14ch] text-[clamp(2.5rem,8vw,5.2rem)] font-black leading-[0.95] tracking-[-0.05em]">
                Compare move-out cleaning quotes in {region}.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">
                Add free, optional cleaning quotes while requesting movers. Match &apos;n Move can share the relevant
                pickup-property details with active cleaners serving {region}, so you can organise the clean without another long form.
              </p>
              <Link
                href="/quote"
                className="mt-7 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-accentOrange px-6 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-orange-500"
              >
                Get free {region} moving and cleaning quotes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <aside className="rounded-[28px] border border-white/12 bg-white/[0.08] p-5 backdrop-blur sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">Locations in this guide</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {localities.map((locality) => (
                  <span key={locality} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100">{locality}</span>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                Cleaner responses depend on the exact address, scope, date, and active provider availability in your area.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef5fb_0%,#ffffff_100%)] py-12 sm:py-16">
        <div className="container-shell">
          <div className="grid gap-5 lg:grid-cols-3">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700"><Sparkles className="h-5 w-5" /></div>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">Planning the clean</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{content.planningNote}</p>
            </article>
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700"><KeyRound className="h-5 w-5" /></div>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">Access and timing</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{content.accessNote}</p>
            </article>
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700"><Home className="h-5 w-5" /></div>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">Property considerations</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{content.propertyNote}</p>
            </article>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">Tips for a {region} cleaning request</h2>
              <ul className="mt-5 space-y-4">
                {content.tips.map((tip) => (
                  <li key={tip} className="flex gap-3 text-base leading-7 text-slate-600">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">Questions to ask a cleaner</h2>
              <ul className="mt-5 space-y-4">
                {content.questions.map((question) => (
                  <li key={question} className="flex gap-3 text-base leading-7 text-slate-600">
                    <CircleHelp className="mt-1 h-5 w-5 shrink-0 text-orange-500" />
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <article className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">Compare the same move-out cleaning scope</h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
              A bedroom count is only a starting point. Give each cleaner the same property, condition, access, and optional-service information so you can compare the actual work offered—not just the headline price.
            </p>
            <ul className="mt-5 grid gap-4 md:grid-cols-2">
              {commonScope.map((item) => (
                <li key={item} className="flex gap-3 rounded-[20px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container-shell">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Helpful next reads</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">Prepare for a clearer cleaning quote</h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {relatedGuides.map((guide) => (
              <Link key={guide.slug} href={`/resources/${guide.slug}`} className="group rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-sky-300 hover:bg-sky-50">
                <h3 className="font-bold text-slate-950">{guide.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{guide.copy}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">Read guide <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-[28px] bg-[linear-gradient(145deg,#0f172a,#17324f)] p-6 text-white sm:p-8">
            <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">Ready to organise your {region} move and clean?</h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-300">
              Complete one moving request and select the optional cleaning offer near the end. Quote requests are free for customers and there is no obligation to book.
            </p>
            <Link href="/quote" className="mt-5 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:-translate-y-0.5">
              Start your free request
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <nav aria-label="Other cleaning quote regions" className="mt-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Other regions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {otherRegions.map((item) => (
                <Link key={item} href={`/cleaning-quotes/${toRegionSlug(item)}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700">
                  {item}
                </Link>
              ))}
              <Link href="/cleaning-quotes" className="rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white">All regions</Link>
            </div>
          </nav>
        </div>
      </section>
    </SiteShell>
  );
}
