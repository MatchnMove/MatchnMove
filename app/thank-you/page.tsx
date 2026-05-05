import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site-shell";

const nextSteps = [
  {
    title: "Request received",
    copy: "Your move details are now in the Match 'n Move pipeline and ready to be reviewed.",
    icon: CheckCircle2,
    iconClassName: "bg-emerald-400/15 text-emerald-200"
  },
  {
    title: "Quotes start moving",
    copy: "Trusted movers are prompted to respond quickly, with many quotes arriving within 24 hours.",
    icon: Clock3,
    iconClassName: "bg-sky-400/15 text-sky-200"
  },
  {
    title: "Your details stay focused",
    copy: "We only pass your request to relevant moving companies in the Match 'n Move network.",
    icon: ShieldCheck,
    iconClassName: "bg-orange-400/15 text-orange-200"
  }
] as const;

export default function ThankYouPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(34,197,94,0.16),transparent_24%),linear-gradient(180deg,#081323_0%,#0c2037_42%,#102845_100%)] py-14 text-white sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-16 h-32 w-32 rounded-full bg-sky-300/10 blur-3xl sm:h-52 sm:w-52" />
          <div className="absolute right-[10%] top-10 h-36 w-36 rounded-full bg-orange-300/10 blur-3xl sm:h-56 sm:w-56" />
          <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
        </div>

        <div className="container-shell relative">
          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.06] shadow-[0_32px_100px_-48px_rgba(15,23,42,0.82)] backdrop-blur-xl">
            <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:px-12 lg:py-12">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100 sm:text-sm">
                  <Sparkles className="h-4 w-4" />
                  Quote submitted successfully
                </p>

                <h1 className="mt-5 max-w-[11ch] text-[clamp(2.6rem,6vw,5.4rem)] font-black leading-[1] tracking-[-0.045em] text-white sm:leading-[0.98]">
                  Your move request is officially in motion.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                  We&apos;ve received your details and will send free, no-obligation moving quotes from trusted local
                  moving companies shortly. Match &apos;n Move keeps the process simple so you can compare options without
                  the usual back-and-forth.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/"
                    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] px-6 py-3 text-base font-semibold text-white shadow-[0_20px_44px_-24px_rgba(34,197,94,0.85)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_48px_-24px_rgba(34,197,94,0.98)]"
                  >
                    Back to home
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex min-h-[54px] items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] px-6 py-3 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.12]"
                  >
                    Contact us
                  </Link>
                </div>
              </div>

              <aside className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-100">What happens next</p>
                <div className="mt-5 space-y-3">
                  {nextSteps.map((step) => {
                    const Icon = step.icon;

                    return (
                      <article
                        key={step.title}
                        className="rounded-[24px] border border-white/10 bg-slate-950/20 px-4 py-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-2xl p-3 ${step.iconClassName}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-white">{step.title}</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-300">{step.copy}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
