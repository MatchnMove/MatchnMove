import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

const benefits = [
  "Choose cleaning quotes near the end of the existing moving form",
  "Share only the pickup-property details relevant to the clean",
  "Compare any responses with no obligation to book",
] as const;

export function CleaningQuotesSeoSection() {
  return (
    <section className="bg-white py-10 sm:py-16 lg:py-20" data-analytics-section="homepage_cleaning_quotes">
      <div className="container-shell">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_88%_14%,rgba(56,189,248,0.16),transparent_30%),linear-gradient(135deg,#f8fbff,#ffffff)] shadow-[0_28px_80px_-50px_rgba(15,23,42,0.35)] sm:rounded-[34px]">
          <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-center lg:p-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Sparkles className="h-4 w-4" />
                Optional move-out cleaning
              </p>
              <h2 className="mt-5 max-w-[17ch] text-[clamp(2rem,7vw,4.2rem)] font-black leading-[0.98] tracking-[-0.05em] text-slate-950">
                Organise the move and the clean together.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Add free move-out or end-of-tenancy cleaning quotes to your moving request without completing another long form.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/cleaning-quotes" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5">
                  Explore cleaning quotes
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/resources#cleaning-guides" className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:border-sky-300 hover:text-sky-700">
                  Read cleaning guides
                </Link>
              </div>
            </div>

            <ul className="space-y-3 rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-sm leading-7 text-slate-600 sm:text-base">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
