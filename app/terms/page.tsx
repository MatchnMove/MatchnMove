import Link from "next/link";
import { ArrowRight, FileCheck2, ShieldCheck, Scale, Users } from "lucide-react";
import { MobileSectionJump } from "@/components/mobile-section-jump";
import { SiteShell } from "@/components/site-shell";
import { SITE_EMAILS, toMailto } from "@/lib/site-emails";

const principles = [
  {
    icon: ShieldCheck,
    title: "Controlled information sharing",
    copy:
      "Information submitted through Match 'n Move is shared only with selected moving companies and requested relocation partners relevant to the enquiry."
  },
  {
    icon: Scale,
    title: "Clear marketplace boundaries",
    copy:
      "Match 'n Move acts as an introduction and lead-distribution platform. Responsibility for services delivered remains with the moving company engaged by the customer."
  },
  {
    icon: FileCheck2,
    title: "Lead protection standards",
    copy:
      "Listed moving businesses must not redistribute, resell, or otherwise misuse leads received through the platform."
  },
  {
    icon: Users,
    title: "Partner accountability",
    copy:
      "Relocation partners are expected to respond within a reasonable timeframe and to uphold standards that reflect well on the Match 'n Move network."
  }
] as const;

const sections = [
  {
    id: "service",
    title: "1. Service scope",
    body: [
      "Match 'n Move aims to introduce furniture removal companies to individuals and businesses seeking relocation services.",
      "We distribute leads created through the website by prospective clients to relocation companies for the removal of domestic, commercial, or office goods and furniture."
    ]
  },
  {
    id: "sharing",
    title: "2. Information handling",
    body: [
      "Information supplied through the website will be forwarded to all selected furniture movers and requested partners relevant to the enquiry.",
      "Under no circumstances will that information be distributed to any unrelated third party outside the Match 'n Move service network.",
      "Match 'n Move will take reasonable steps to protect the information supplied by users."
    ]
  },
  {
    id: "lead-use",
    title: "3. Lead use restrictions",
    body: [
      "No moving company or moving business listed on Match 'n Move may redistribute, resell, transfer, or otherwise disclose any lead received through the website to a third party not associated with Match 'n Move.",
      "If a moving company or moving business is suspected of redistributing or reselling leads and is subsequently found to have done so, Match 'n Move may remove that business from the platform immediately and may recover associated losses, costs, or charges as applicable."
    ]
  },
  {
    id: "liability",
    title: "4. Liability and third-party services",
    body: [
      "Match 'n Move is an introduction platform and will not be held responsible for services, labour, advice, pricing, or materials provided by moving companies as a result of an introduction made through the website.",
      "Match 'n Move will not be responsible for any loss of, or damage to, goods or furniture arising from the use of any moving company introduced through the platform."
    ]
  },
  {
    id: "partners",
    title: "5. Partner selection and removal",
    body: [
      "Match 'n Move reserves the right to screen, appoint, suspend, or remove any relocation partner or listed moving company at its sole discretion.",
      "We may terminate the services of any listed business if its conduct, service quality, or business practices bring the name or reputation of Match 'n Move into disrepute."
    ]
  },
  {
    id: "responses",
    title: "6. Response expectations",
    body: [
      "Moving companies appointed by Match 'n Move undertake to respond to quote requests within a reasonable period. The recommended response time is 24 hours.",
      "Match 'n Move cannot be held responsible for delayed responses or for a failure by a listed moving company to respond."
    ]
  },
  {
    id: "feedback",
    title: "7. Customer feedback",
    body: [
      "Clients who experience delays or receive no response are encouraged to inform Match 'n Move so the matter can be reviewed.",
      `Positive feedback is also welcomed and appreciated. Feedback may be sent to ${SITE_EMAILS.feedback}.`
    ]
  }
] as const;

const onThisPageLinkClassName =
  "group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-100 shadow-[0_18px_38px_-30px_rgba(14,165,233,0.45)] transition duration-300 hover:-translate-y-[1px] hover:border-sky-300/30 hover:bg-[linear-gradient(135deg,rgba(59,130,246,0.2),rgba(14,165,233,0.12))] hover:text-white hover:shadow-[0_22px_46px_-24px_rgba(56,189,248,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export default function TermsPage() {
  return (
    <SiteShell>
      <section className="relative bg-[linear-gradient(180deg,#eef4fb_0%,#f8fbfd_36%,#ffffff_100%)] py-14 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[4%] top-10 h-40 w-40 rounded-full bg-sky-200/50 blur-3xl sm:h-64 sm:w-64" />
          <div className="absolute right-[8%] top-16 h-44 w-44 rounded-full bg-emerald-100/70 blur-3xl sm:h-72 sm:w-72" />
          <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),transparent)]" />
        </div>

        <div className="container-shell relative">
          <div className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(9,18,32,0.98),rgba(23,50,79,0.95))] px-6 py-7 text-white shadow-[0_30px_90px_-48px_rgba(15,23,42,0.58)] sm:px-8 sm:py-9 lg:px-12 lg:py-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.72fr)] lg:items-end">
              <div className="max-w-3xl">
                <p className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100 backdrop-blur sm:text-sm">
                  Terms of Use
                </p>
                <h1 className="mt-5 text-[clamp(2.8rem,8vw,5.1rem)] font-black leading-[0.92] tracking-[-0.06em] text-white">
                  Disclaimer and conditions of service.
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                  These terms explain how Match &apos;n Move handles introductions between customers and moving companies,
                  how submitted information is shared, and where responsibility sits once a customer engages a mover.
                </p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/[0.08] p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">Document status</p>
                <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">Current</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Last updated: March 30, 2026.
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  This page applies to users submitting quote requests or interacting with Match &apos;n Move through the
                  website.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {principles.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-[26px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_52px_-38px_rgba(15,23,42,0.28)] backdrop-blur"
                >
                  <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold tracking-[-0.03em] text-slate-950">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.copy}</p>
                </article>
              );
            })}
          </div>

          <div
            id="terms-on-this-page"
            className="mt-8 rounded-[28px] border border-slate-200 bg-[linear-gradient(145deg,#0f172a,#17324f)] p-6 text-white shadow-[0_28px_74px_-44px_rgba(15,23,42,0.72)] lg:hidden"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/75">On this page</p>
            <ul className="mt-4 space-y-3">
              {sections.map((section) => (
                <li key={section.id}>
                  <a className={onThisPageLinkClassName} href={`#${section.id}`}>
                    <span className="absolute inset-y-2 left-2 w-12 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.3),transparent_72%)] opacity-70 transition duration-300 group-hover:opacity-100" />
                    <span className="relative inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2 text-xs font-semibold tracking-[0.08em] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                      {section.title.split(".")[0]}
                    </span>
                    <span className="relative font-medium leading-6 text-slate-100 transition duration-300 group-hover:text-white">
                      {section.title.replace(/^\d+\.\s*/, "")}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_320px] lg:items-start">
            <div className="space-y-5">
              {sections.map((section) => (
                <article
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.28)] sm:p-7"
                >
                  <div className="h-1 w-20 rounded-full bg-[linear-gradient(90deg,#0f172a,#38bdf8)]" />
                  <h3 className="mt-5 text-[clamp(1.8rem,4vw,2.7rem)] font-black leading-[0.97] tracking-[-0.04em] text-slate-950">
                    {section.title}
                  </h3>
                  <div className="mt-5 space-y-4">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-7 text-slate-600 sm:text-base">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(145deg,#0f172a,#17324f)] p-6 text-white shadow-[0_28px_74px_-44px_rgba(15,23,42,0.72)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/75">On this page</p>
                <ul className="mt-4 space-y-3">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a className={onThisPageLinkClassName} href={`#${section.id}`}>
                        <span className="absolute inset-y-2 left-2 w-12 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.3),transparent_72%)] opacity-70 transition duration-300 group-hover:opacity-100" />
                        <span className="relative inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2 text-xs font-semibold tracking-[0.08em] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                          {section.title.split(".")[0]}
                        </span>
                        <span className="relative font-medium leading-6 text-slate-100 transition duration-300 group-hover:text-white">
                          {section.title.replace(/^\d+\.\s*/, "")}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.24)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Feedback</p>
                <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">Need to report a delay or concern?</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Send feedback to{" "}
                  <Link
                    href={toMailto(SITE_EMAILS.feedback)}
                    className="font-semibold text-sky-700 transition hover:text-sky-800"
                  >
                    {SITE_EMAILS.feedback}
                  </Link>
                  .
                </p>
                <Link
                  href={toMailto(SITE_EMAILS.feedback)}
                  className="mt-5 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#17324f)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-28px_rgba(15,23,42,0.68)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_48px_-28px_rgba(15,23,42,0.78)]"
                >
                  Email feedback
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </aside>
          </div>

          <div className="mt-8 lg:hidden">
            <div className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.24)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Feedback</p>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">
                Need to report a delay or concern?
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Send feedback to{" "}
                <Link
                  href={toMailto(SITE_EMAILS.feedback)}
                  className="font-semibold text-sky-700 transition hover:text-sky-800"
                >
                  {SITE_EMAILS.feedback}
                </Link>
                .
              </p>
              <Link
                href={toMailto(SITE_EMAILS.feedback)}
                className="mt-5 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#17324f)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-28px_rgba(15,23,42,0.68)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_48px_-28px_rgba(15,23,42,0.78)]"
              >
                Email feedback
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <MobileSectionJump targetId="terms-on-this-page" label="Back to On this page" />
      </section>
    </SiteShell>
  );
}
