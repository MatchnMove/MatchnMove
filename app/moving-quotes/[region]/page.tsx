import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, MapPinned, Route, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import {
  canonicaliseServiceArea,
  NZ_SERVICE_AREA_LOCALITIES,
  NZ_SERVICE_AREAS,
  type NzServiceArea,
} from "@/lib/nz-regions";
import { getPublicMovers } from "@/lib/public-movers";
import { absoluteUrl, createPageMetadata, getRegionFromSlug, SITE_NAME, SITE_URL, toRegionSlug } from "@/lib/seo";

export const revalidate = 300;

const regionalPlanningNotes: Record<NzServiceArea, string> = {
  Northland: "Allow for travel time between smaller towns and confirm whether your mover charges depot-to-depot or door-to-door.",
  Auckland: "Traffic, apartment access, loading zones, and motorway timing can materially affect the time needed for an Auckland move.",
  Waikato: "Tell movers whether your route is within Hamilton or connects rural Waikato, Taupo, or the Coromandel so travel can be priced accurately.",
  "Bay of Plenty": "Peak traffic around Tauranga and seasonal demand in coastal areas can affect availability, so include flexible dates where possible.",
  Gisborne: "Longer road connections to neighbouring regions make accurate inventory and access details especially useful for planning.",
  "Hawke's Bay": "Clarify whether the move is within Napier or Hastings, elsewhere in Hawke's Bay, or part of a longer intercity route.",
  Taranaki: "Include rural access, driveway, and parking notes for moves outside New Plymouth or between towns around the mountain.",
  "Manawatu-Whanganui": "Routes can span several centres, so include both towns and any narrow-access or rural-property details in your request.",
  Wellington: "Hills, stairs, restricted parking, and apartment access are common pricing factors across the Wellington region.",
  Tasman: "For routes beyond Richmond and Motueka, give movers clear travel and access details, particularly for remote or rural properties.",
  Nelson: "Mention central-city parking, steep driveways, apartment access, and whether the job continues into Tasman or Marlborough.",
  Marlborough: "For moves involving the Sounds or ferry connections, include timing and access constraints as early as possible.",
  "West Coast": "Long distances between towns and changing road conditions make route, inventory, and date flexibility important.",
  Canterbury: "State whether the move is within Christchurch or connects regional towns such as Rangiora, Ashburton, Timaru, or Kaikoura.",
  Otago: "Steep access, winter conditions, and long routes between Dunedin, Central Otago, Queenstown, and Wanaka can influence planning.",
  Southland: "Give movers full route details for moves outside Invercargill, including rural access and any connection to Otago or Fiordland.",
};

const comparisonChecklist = [
  "Confirm whether the quote is fixed-price or estimated by time.",
  "Check what packing, dismantling, storage, and heavy-item services are included.",
  "Compare availability, communication, reviews, and insurance details as well as price.",
  "Tell the mover about stairs, lifts, narrow driveways, parking limits, and fragile items.",
] as const;

export function generateStaticParams() {
  return NZ_SERVICE_AREAS.map((region) => ({
    region: toRegionSlug(region),
  }));
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
      title: "Moving Quotes NZ",
      description: "Compare free moving quotes from trusted New Zealand moving companies.",
      path: `/moving-quotes/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: `Free Moving Quotes ${region}`,
    description: `Compare free moving quotes for local and long-distance moves in ${region}. Submit one request and hear from relevant New Zealand moving companies.`,
    path: `/moving-quotes/${toRegionSlug(region)}`,
  });
}

export default async function RegionalMovingQuotesPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region: slug } = await params;
  const region = getRegionFromSlug(slug);
  if (!region) notFound();

  const localities = NZ_SERVICE_AREA_LOCALITIES[region];
  const movers = (await getPublicMovers()).filter((mover) =>
    mover.serviceAreas.some((serviceArea) => canonicaliseServiceArea(serviceArea) === region),
  );
  const path = `/moving-quotes/${toRegionSlug(region)}`;
  const pageUrl = absoluteUrl(path);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: `${region} moving quotes`,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "Service",
        name: `Free moving quote comparison in ${region}`,
        description: `Compare moving quotes for local and long-distance relocations in ${region}, New Zealand.`,
        url: pageUrl,
        serviceType: "Moving quote comparison",
        provider: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: SITE_URL,
        },
        areaServed: {
          "@type": "AdministrativeArea",
          name: `${region}, New Zealand`,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "NZD",
          description: "Free for customers to request moving quotes.",
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

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_28%),linear-gradient(145deg,#071525,#12345d)] py-12 text-white sm:py-16 lg:py-20">
        <div className="container-shell relative">
          <nav aria-label="Breadcrumb" className="text-sm text-sky-100/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span>{region} moving quotes</span>
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.7fr)] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                <MapPinned className="h-4 w-4" />
                {region}, New Zealand
              </p>
              <h1 className="mt-5 max-w-[14ch] text-[clamp(2.5rem,8vw,5.2rem)] font-black leading-[0.95] tracking-[-0.05em]">
                Compare free moving quotes in {region}.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                Planning a local or long-distance move? Submit your details once and compare quotes from moving
                companies that serve {region}. Match &apos;n Move is free for customers and there is no obligation to book.
              </p>
              <Link
                href="/quote"
                className="mt-7 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] px-6 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
              >
                Get free {region} moving quotes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <aside className="rounded-[28px] border border-white/12 bg-white/[0.08] p-5 backdrop-blur sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Areas covered</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {localities.map((locality) => (
                  <span key={locality} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100">
                    {locality}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                Availability depends on your exact route, move date, inventory, and the movers active in your area.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef5fb_0%,#ffffff_100%)] py-12 sm:py-16">
        <div className="container-shell">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700">
                <Route className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">
                Planning a move in {region}
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{regionalPlanningNotes[region]}</p>
              <p className="mt-4 text-base leading-8 text-slate-600">
                A detailed request helps moving companies compare the same job and provide more useful pricing. Include
                your preferred date, property type, main furniture items, access at both addresses, and any services
                such as packing or storage.
              </p>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">
                How to compare moving quotes
              </h2>
              <ul className="mt-5 space-y-4">
                {comparisonChecklist.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-slate-600 sm:text-base">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Mover directory</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  Moving companies serving {region}
                </h2>
              </div>
              <Link href="/movers" className="inline-flex items-center gap-2 font-semibold text-sky-700 hover:text-sky-800">
                View all movers
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {movers.length > 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {movers.slice(0, 6).map((mover) => (
                  <Link
                    key={mover.id}
                    href={`/movers/${mover.id}`}
                    className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    <div className="flex items-start gap-3">
                      <Building2 className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                      <div>
                        <h3 className="font-bold text-slate-950">{mover.companyName}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {mover.totalReviewCount > 0
                            ? `${mover.averageRating.toFixed(1)} from ${mover.totalReviewCount} verified review${mover.totalReviewCount === 1 ? "" : "s"}`
                            : "Public mover profile"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="font-semibold text-slate-900">Public profiles for this region are still being added.</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  You can still submit a quote request so Match &apos;n Move can connect your route with relevant movers.
                </p>
              </div>
            )}
          </section>

          <div className="mt-8 rounded-[28px] bg-[linear-gradient(145deg,#0f172a,#17324f)] p-6 text-white sm:p-8">
            <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
              Ready to compare {region} moving quotes?
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-300">
              Add your route and move details to request free, no-obligation quotes from relevant moving companies.
            </p>
            <Link
              href="/quote"
              className="mt-5 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:-translate-y-0.5"
            >
              Start your free quote request
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

