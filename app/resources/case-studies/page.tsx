import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, FileCheck2, ShieldCheck, WalletCards } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Verified Moving Case Studies",
  description:
    "Match 'n Move publishes anonymised moving case studies only when route, move size, cost information, challenges, and outcomes can be supported and shared appropriately.",
  path: "/resources/case-studies",
  noIndex: true,
});

const publicationFields = [
  {
    icon: FileCheck2,
    title: "Route and move size",
    copy: "General origin and destination areas, property type, bedrooms, and enough inventory context to make the example useful.",
  },
  {
    icon: WalletCards,
    title: "Customer-approved cost",
    copy: "An approximate final amount or agreed range, clearly labelled with what the price included.",
  },
  {
    icon: ShieldCheck,
    title: "Challenges and privacy",
    copy: "Relevant access or logistics challenges without names, exact addresses, or identifying personal details.",
  },
  {
    icon: BadgeCheck,
    title: "Outcome evidence",
    copy: "A completed-job status and suitable customer feedback or other evidence supporting the stated outcome.",
  },
] as const;

export default function CaseStudiesPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_28%),linear-gradient(145deg,#071525,#12345d)] py-12 text-white sm:py-16">
        <div className="container-shell relative">
          <nav aria-label="Breadcrumb" className="text-sm text-sky-100/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <Link href="/resources" className="hover:text-white">Resources</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span>Case studies</span>
          </nav>
          <div className="mt-7 max-w-4xl">
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Verified outcomes only
            </p>
            <h1 className="mt-5 text-[clamp(2.5rem,8vw,5.2rem)] font-black leading-[0.96] tracking-[-0.05em]">
              Real moving case studies, without invented numbers.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">
              This library will contain anonymised completed moves with a route, move size, customer-approved
              approximate cost, genuine challenges, and a supported outcome. No case study is published until those
              details exist and can be shared responsibly.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef5fb_0%,#ffffff_100%)] py-12 sm:py-16">
        <div className="container-shell">
          <div className="rounded-[30px] border border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#ffffff)] p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Publication status</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">
              No verified case studies are published yet.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              Match &apos;n Move currently records quote requests and mover workflow, but it does not record the
              customer&apos;s final moving invoice. Previous test leads and reviews were also removed during the public
              directory cleanup. Publishing made-up costs or outcomes would be misleading, so this page remains
              excluded from search indexing until the first complete, permissioned case study is available.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {publicationFields.map((field) => {
              const Icon = field.icon;
              return (
                <article key={field.title} className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700 w-fit">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-slate-950">{field.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{field.copy}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-8 rounded-[28px] bg-[linear-gradient(145deg,#0f172a,#17324f)] p-6 text-white sm:p-8">
            <h2 className="text-2xl font-black tracking-[-0.04em]">Useful planning help is available now.</h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-300">
              Use the cost guide and calculator for a transparent planning range, then request actual quotes for your
              route and inventory.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/resources/moving-cost-calculator"
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950"
              >
                Use the calculator
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/quote"
                className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-3 font-semibold text-white"
              >
                Request free quotes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

