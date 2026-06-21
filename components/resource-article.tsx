import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Info } from "lucide-react";
import type { MovingResource, ResourceSection } from "@/lib/moving-resources";
import { getResourceCard } from "@/lib/moving-resources";

export function ResourceArticle({ resource }: { resource: MovingResource }) {
  return (
    <>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(34,197,94,0.14),transparent_24%),linear-gradient(145deg,#071525,#12345d)] py-12 text-white sm:py-16 lg:py-20">
        <div className="container-shell relative">
          <nav aria-label="Breadcrumb" className="text-sm text-sky-100/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <Link href="/resources" className="hover:text-white">Resources</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span>{resource.shortTitle}</span>
          </nav>

          <div className="mt-7 max-w-4xl">
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              {resource.eyebrow}
            </p>
            <h1 className="mt-5 text-[clamp(2.45rem,8vw,5.3rem)] font-black leading-[0.96] tracking-[-0.05em] text-white">
              {resource.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">{resource.intro}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">
                <CalendarDays className="h-4 w-4 text-sky-200" />
                {resource.updatedLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">
                <Clock3 className="h-4 w-4 text-sky-200" />
                {resource.readTime}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef5fb_0%,#ffffff_32%)] py-10 sm:py-14">
        <div className="container-shell">
          <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
            <article className="min-w-0 space-y-6">
              {resource.sections.map((section) => (
                <ResourceSectionBlock key={section.heading} section={section} />
              ))}

              <SourceNotes resourceSlug={resource.slug} />
            </article>

            <aside className="space-y-5 xl:sticky xl:top-6">
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Planning note</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Prices in these guides are indicative NZD planning ranges. A mover must review your route, inventory,
                  access, date, and requested services before giving you a usable quote.
                </p>
                <Link
                  href="/quote"
                  className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  Request free quotes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Related resources</p>
                <div className="mt-4 grid gap-3">
                  {resource.relatedSlugs.map((slug) => {
                    const related = getResourceCard(slug);
                    if (!related) return null;

                    return (
                      <Link
                        key={slug}
                        href={`/resources/${slug}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-sky-50"
                      >
                        <p className="font-semibold text-slate-950">{related.shortTitle}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{related.description}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

function ResourceSectionBlock({ section }: { section: ResourceSection }) {
  if (section.type === "callout") {
    return (
      <section className="rounded-[28px] border border-sky-200 bg-[linear-gradient(135deg,#eff8ff,#f0fdf4)] p-6 shadow-sm sm:p-7">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white p-3 text-sky-700 shadow-sm">
            <Info className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{section.heading}</h2>
            <p className="mt-3 text-base leading-8 text-slate-700">{section.copy}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">{section.heading}</h2>

      {"intro" in section && section.intro ? (
        <p className="mt-3 text-base leading-8 text-slate-600">{section.intro}</p>
      ) : null}

      {section.type === "copy" ? (
        <div className="mt-4 space-y-4">
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-base leading-8 text-slate-600">{paragraph}</p>
          ))}
        </div>
      ) : null}

      {section.type === "list" ? (
        <ul className="mt-5 space-y-3">
          {section.items.map((item) => (
            <li key={item} className="flex gap-3 text-base leading-7 text-slate-600">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {section.type === "steps" ? (
        <ol className="mt-5 grid gap-4 sm:grid-cols-2">
          {section.items.map((item, index) => (
            <li key={item.title} className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Step {index + 1}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.copy}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {section.type === "table" ? (
        <>
          <div className="mt-5 grid gap-3 sm:hidden">
            {section.rows.map((row) => (
              <dl key={row.join("-")} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                {row.map((cell, cellIndex) => (
                  <div
                    key={`${cell}-${cellIndex}`}
                    className={`grid gap-1 px-4 py-3 ${cellIndex > 0 ? "border-t border-slate-200" : "bg-slate-950 text-white"}`}
                  >
                    <dt
                      className={`text-[0.68rem] font-bold uppercase tracking-[0.14em] ${
                        cellIndex > 0 ? "text-slate-500" : "text-sky-200"
                      }`}
                    >
                      {section.columns[cellIndex]}
                    </dt>
                    <dd className={`break-words text-sm leading-6 ${cellIndex > 0 ? "text-slate-700" : "font-semibold text-white"}`}>
                      {cell}
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>

          <div className="mt-5 hidden max-w-full overflow-x-auto rounded-[22px] border border-slate-200 sm:block">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead className="bg-slate-950 text-white">
                <tr>
                  {section.columns.map((column) => (
                    <th key={column} className="px-4 py-3 text-sm font-semibold">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, rowIndex) => (
                  <tr key={row.join("-")} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${cell}-${cellIndex}`}
                        className={`border-t border-slate-200 px-4 py-3 text-sm leading-6 ${
                          cellIndex === 0 ? "font-semibold text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {section.note ? <p className="mt-3 text-sm leading-6 text-slate-500">{section.note}</p> : null}
        </>
      ) : null}
    </section>
  );
}

function SourceNotes({ resourceSlug }: { resourceSlug: string }) {
  const isCostContent = [
    "nz-moving-costs-2026",
    "auckland-moving-costs",
    "wellington-moving-costs",
    "christchurch-moving-costs",
    "inter-island-moving-guide",
  ].includes(resourceSlug);

  if (!isCostContent) return null;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-lg font-bold text-slate-950">Method and source notes</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Planning ranges were reviewed in June 2026 using publicly available NZ mover rate cards and market guides.
        Match &apos;n Move does not claim these figures are a statistical market average. Published examples include{" "}
        <a className="font-semibold text-sky-700 underline" href="https://aucklandmovers.co.nz/rates" rel="noreferrer" target="_blank">
          Auckland Movers rates
        </a>
        ,{" "}
        <a className="font-semibold text-sky-700 underline" href="https://www.wisemove.co.nz/moving-companies" rel="noreferrer" target="_blank">
          Wise Move&apos;s NZ guide
        </a>
        , and{" "}
        <a className="font-semibold text-sky-700 underline" href="https://www.airtasker.com/nz/costs/removals/how-much-does-removalist-cost/" rel="noreferrer" target="_blank">
          Airtasker NZ&apos;s removal-cost guide
        </a>
        . For inter-island service structure, see{" "}
        <a className="font-semibold text-sky-700 underline" href="https://www.crownrelo.co.nz/moving-within-new-zealand/long-distance/" rel="noreferrer" target="_blank">
          Crown&apos;s long-distance overview
        </a>
        . Eligibility information for financial help should be checked directly with{" "}
        <a className="font-semibold text-sky-700 underline" href="https://www.workandincome.govt.nz/housing/move-house/moving-costs.html" rel="noreferrer" target="_blank">
          Work and Income
        </a>
        .
      </p>
    </section>
  );
}
