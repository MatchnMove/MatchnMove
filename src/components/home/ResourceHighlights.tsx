import Link from "next/link";
import { ArrowRight, Calculator, CheckSquare2, Route, WalletCards } from "lucide-react";

const highlights = [
  {
    href: "/resources/nz-moving-costs-2026",
    title: "NZ Moving Costs in 2026",
    copy: "See broad hourly and home-size planning ranges, plus the factors that change a quote.",
    icon: WalletCards,
  },
  {
    href: "/resources/moving-cost-calculator",
    title: "Moving Cost Calculator",
    copy: "Build a broad NZ budget from route, load size, access, timing, and optional services.",
    icon: Calculator,
  },
  {
    href: "/resources/inter-island-moving-guide",
    title: "Inter-Island Moving Guide",
    copy: "Plan freight, timing, packing, storage, insurance questions, and an arrival kit.",
    icon: Route,
  },
  {
    href: "/resources/moving-house-checklist",
    title: "Moving-House Checklist",
    copy: "Work through quotes, packing, utilities, address changes, moving day, and arrival.",
    icon: CheckSquare2,
  },
] as const;

export function ResourceHighlights() {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="container-shell">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Free moving resources</p>
            <h2 className="mt-3 max-w-[16ch] text-[clamp(2rem,7vw,4rem)] font-black leading-[0.98] tracking-[-0.04em] text-slate-950">
              Plan with practical guides before moving day.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Get clearer on likely costs, prepare the right details, and compare moving quotes on equal terms.
            </p>
          </div>
          <Link
            href="/resources"
            className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 font-semibold text-white"
          >
            View all resources
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((highlight) => {
            const Icon = highlight.icon;

            return (
              <Link
                key={highlight.href}
                href={highlight.href}
                className="group rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-5 shadow-sm transition hover:-translate-y-1 hover:border-sky-300"
              >
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-700 w-fit">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-slate-950">{highlight.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{highlight.copy}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                  Read resource
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

