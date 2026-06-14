import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPinned, ShieldCheck } from "lucide-react";
import { NZ_SERVICE_AREA_GROUPS } from "@/lib/nz-regions";
import { toRegionSlug } from "@/lib/seo";

const benefits = [
  {
    icon: BadgeCheck,
    title: "Free for customers",
    copy: "There is no fee to submit your move and compare the quotes you receive.",
  },
  {
    icon: MapPinned,
    title: "Local and long-distance moves",
    copy: "Request pricing for moves within one city, between regions, or across New Zealand.",
  },
  {
    icon: ShieldCheck,
    title: "Relevant moving companies",
    copy: "Your request is shared with movers suited to your route and move details.",
  },
] as const;

export function MovingQuotesSeoSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef6fb_100%)] py-12 sm:py-16 lg:py-20">
      <div className="container-shell">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Moving quotes across New Zealand</p>
            <h2 className="mt-3 max-w-[16ch] text-[clamp(2rem,7vw,4rem)] font-black leading-[0.98] tracking-[-0.04em] text-slate-950">
              A simpler way to find free moving quotes in NZ.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Match &apos;n Move helps households and businesses compare moving company quotes without contacting every
              mover separately. Add your pickup, destination, move date, property details, and inventory once so
              relevant movers can price the same job.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Quotes are free and carry no obligation. Compare the total price, availability, service-area fit,
              communication, and verified customer feedback before choosing a moving company.
            </p>
            <Link
              href="/quote"
              className="mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#17324f)] px-6 py-3 font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
            >
              Get free moving quotes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article key={benefit.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{benefit.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{benefit.copy}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-10 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Find quotes near you</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
                Moving quote guides by region
              </h2>
            </div>
            <Link href="/movers" className="inline-flex items-center gap-2 font-semibold text-sky-700 hover:text-sky-800">
              Browse moving companies
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {NZ_SERVICE_AREA_GROUPS.map((group) => (
              <div key={group.id}>
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{group.label}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.regions.map((region) => (
                    <Link
                      key={region}
                      href={`/moving-quotes/${toRegionSlug(region)}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
                    >
                      {region} moving quotes
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

