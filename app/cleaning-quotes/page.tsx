import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Home,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { cleaningResources } from "@/lib/cleaning-resources";
import { NZ_SERVICE_AREAS } from "@/lib/nz-regions";
import { absoluteUrl, createPageMetadata, SITE_NAME, SITE_URL, toRegionSlug } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Free Move-Out Cleaning Quotes NZ",
  description:
    "Compare free move-out and end-of-tenancy cleaning quotes while organising your move. One simple Match 'n Move request, with no obligation to book.",
  path: "/cleaning-quotes",
});

const steps = [
  {
    title: "Tell us about your move",
    copy: "Complete the usual three-step moving quote request with your pickup property, destination, and contact details.",
  },
  {
    title: "Choose cleaning quotes",
    copy: "Near the end of the form, select the optional move-out cleaning offer and add a short note only if you want to.",
  },
  {
    title: "Relevant cleaners can respond",
    copy: "We match the cleaning request using the pickup property area and share only the details needed to assess that clean.",
  },
  {
    title: "Compare your options",
    copy: "Review any responses and book the provider you prefer. Requesting quotes is free for customers and there is no obligation.",
  },
] as const;

const scopeChecklist = [
  "The property type, bedroom count, condition, and whether it will be empty",
  "The preferred cleaning date and the time movers are expected to finish",
  "Kitchen, oven, bathroom, carpet, window, cupboard, or garage requirements",
  "Parking, stairs, lifts, gates, keys, power, water, and other access details",
] as const;

const faqs = [
  {
    question: "Are cleaning quotes free for customers?",
    answer:
      "Yes. It is free for customers to request moving and optional move-out cleaning quotes through Match 'n Move, and there is no obligation to accept an offer.",
  },
  {
    question: "Which property will cleaners quote?",
    answer:
      "The first version is designed for the pickup property—the home you are moving out of. Make any special requirements clear in the optional cleaning note.",
  },
  {
    question: "Do cleaners receive my destination address or moving inventory?",
    answer:
      "No. Cleaners receive the pickup-property, contact, date, and cleaning information relevant to their work. Destination and detailed moving inventory information are not part of the cleaning lead.",
  },
  {
    question: "Does requesting quotes guarantee cleaner availability?",
    answer:
      "No. Responses depend on active cleaning companies serving your pickup area and being available for the requested work and date.",
  },
] as const;

export default function CleaningQuotesPage() {
  const featuredResources = cleaningResources.slice(0, 6);
  const pageUrl = absoluteUrl("/cleaning-quotes");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Cleaning quotes", item: pageUrl },
        ],
      },
      {
        "@type": "Service",
        name: "Move-out cleaning quote comparison in New Zealand",
        description:
          "Request move-out or end-of-tenancy cleaning quotes alongside a moving quote request through Match 'n Move.",
        url: pageUrl,
        serviceType: "Move-out cleaning quote comparison",
        provider: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: SITE_URL,
        },
        areaServed: { "@type": "Country", name: "New Zealand" },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "NZD",
          description: "Free for customers to request cleaning quotes; no obligation to book.",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(249,115,22,0.14),transparent_24%),linear-gradient(145deg,#071525,#12345d)] py-12 text-white sm:py-16 lg:py-20">
        <div className="container-shell relative">
          <nav aria-label="Breadcrumb" className="text-sm text-sky-100/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span>Cleaning quotes</span>
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.72fr)] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                <Sparkles className="h-4 w-4" />
                Move-out cleaning across New Zealand
              </p>
              <h1 className="mt-5 max-w-[14ch] text-[clamp(2.6rem,8vw,5.4rem)] font-black leading-[0.95] tracking-[-0.055em]">
                Compare move-out cleaning quotes while you plan the move.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">
                You&apos;re already organising the move. Get the cleaning sorted at the same time by adding free,
                optional cleaning quotes to your Match &apos;n Move request—without filling out another long form.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/quote"
                  className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-accentOrange px-6 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-orange-500"
                >
                  Get free moving and cleaning quotes
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/resources#cleaning-guides"
                  className="inline-flex min-h-[54px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] px-6 py-3 font-semibold text-white transition hover:bg-white/[0.13]"
                >
                  Read cleaning guides
                </Link>
              </div>
            </div>

            <aside className="rounded-[28px] border border-white/12 bg-white/[0.08] p-5 backdrop-blur sm:p-6">
              <div className="inline-flex rounded-2xl bg-white/10 p-3 text-sky-100">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-black text-white">Optional, focused, and privacy-conscious</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                You choose whether to receive cleaning quotes. Suitable cleaners see only the pickup-property and
                cleaning details relevant to quoting their work—not your destination or detailed moving inventory.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef5fb_0%,#ffffff_100%)] py-12 sm:py-16">
        <div className="container-shell">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">How it works</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
              One request for the move and the clean.
            </h2>
          </div>
          <ol className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.copy}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700"><ClipboardCheck className="h-6 w-6" /></div>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">What helps a cleaner quote accurately</h2>
              <ul className="mt-5 space-y-4">
                {scopeChecklist.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-slate-600 sm:text-base">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="inline-flex rounded-2xl bg-orange-50 p-3 text-orange-600"><Home className="h-6 w-6" /></div>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">Move-out and end-of-tenancy cleaning</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                A useful cleaning quote describes the actual property and required result. Ask what is included,
                whether supplies and GST are covered, how extras are approved, and when the property must be empty.
                Oven, carpet, exterior windows, high work, rubbish, mould, and restoration may require separate scope.
              </p>
              <Link href="/resources/compare-cleaning-quotes" className="mt-5 inline-flex items-center gap-2 font-semibold text-sky-700 hover:text-sky-800">
                Learn how to compare cleaning quotes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container-shell">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Local planning</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">Cleaning quotes by region</h2>
              <p className="mt-3 text-base leading-8 text-slate-600">Read locally relevant access, property, and scheduling guidance for your pickup region.</p>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {NZ_SERVICE_AREAS.map((region) => (
              <Link
                key={region}
                href={`/cleaning-quotes/${toRegionSlug(region)}`}
                className="group flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 font-semibold text-slate-900 transition hover:border-sky-300 hover:bg-sky-50"
              >
                <span className="inline-flex items-center gap-2"><MapPinned className="h-4 w-4 text-sky-700" />{region}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-sky-700" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="container-shell">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Cleaning resource hub</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">Plan the clean before moving day</h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredResources.map((resource) => (
              <Link key={resource.slug} href={`/resources/${resource.slug}`} className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">{resource.readTime}</p>
                <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">{resource.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{resource.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 font-semibold text-sky-700">Read guide <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </div>
          <Link href="/resources#cleaning-guides" className="mt-6 inline-flex items-center gap-2 font-semibold text-sky-700 hover:text-sky-800">
            Browse all 25 cleaning guides
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container-shell grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Common questions</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">Before you request cleaning quotes</h2>
            <div className="mt-6 divide-y divide-slate-200 rounded-[28px] border border-slate-200 bg-white px-5 shadow-sm sm:px-7">
              {faqs.map((faq) => (
                <article key={faq.question} className="py-5">
                  <h3 className="font-bold text-slate-950">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
          <aside className="h-fit rounded-[28px] bg-[linear-gradient(145deg,#0f172a,#17324f)] p-6 text-white sm:p-8 lg:mt-16">
            <h2 className="text-2xl font-black tracking-[-0.04em]">Ready to organise both?</h2>
            <p className="mt-3 text-base leading-8 text-slate-300">Submit your move once and choose the optional cleaning offer near the end. It remains free for customers.</p>
            <Link href="/quote" className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:-translate-y-0.5">
              Start your free request
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
