/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Camera, Compass, Sparkles, UploadCloud, Users2 } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { getAboutPageStats } from "@/lib/about-stats";
import { NZ_SERVICE_AREAS, dedupeServiceAreaLabels, formatServiceAreaLabel } from "@/lib/nz-regions";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "About Match 'n Move",
  description:
    "Learn how Match 'n Move connects New Zealand customers with relevant moving companies for free quote comparison.",
  path: "/about",
});

const teamCards = [
  {
    name: "Lance Oosterbroek",
    title: "Founder / Developer",
    role: "Platform build",
    image: "/match-n-move-web-ready-images/match-n-move-team-1-web.webp",
    note: "Building the Match 'n Move experience and the tools behind every quote."
  },
  {
    name: "Tiaan Gouws",
    title: "Finance Lead",
    role: "Business oversight",
    image: "/match-n-move-web-ready-images/match-n-move-team-2-web.webp",
    note: "Guiding the money, operations, and launch decisions that keep the business steady."
  },
  {
    name: "Seth Clark",
    title: "Partnerships Lead",
    role: "Calls and comms",
    image: "/match-n-move-web-ready-images/match-n-move-team-3-web.webp",
    note: "Managing calls, mover relationships, and business partnerships with a clear voice."
  }
] as const;

const storyCards = [
  {
    icon: Compass,
    eyebrow: "Why we exist",
    title: "A smoother path from quote request to moving day.",
    copy:
      "Match 'n Move is designed to cut through the slow back-and-forth. Customers get a cleaner way to compare options, and movers get access to clearer, better-timed opportunities."
  },
  {
    icon: BadgeCheck,
    eyebrow: "How we work",
    title: "Built around trust, clarity, and momentum.",
    copy:
      "Every part of the platform is focused on reducing friction: easier lead flow, better visibility, and a more polished experience on both sides of the move."
  }
] as const;

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [movers, successfulMoves] = await getAboutPageStats();

  const moversWithLogos = movers.filter((mover) => Boolean(mover.logoUrl));
  const networkServiceAreas = dedupeServiceAreaLabels(movers.flatMap((mover) => mover.serviceAreas).filter(Boolean));
  const officialServiceAreaSet = new Set<string>(NZ_SERVICE_AREAS);
  const serviceAreas = [
    ...NZ_SERVICE_AREAS.filter((area) => networkServiceAreas.includes(area)),
    ...networkServiceAreas.filter((area) => !officialServiceAreaSet.has(area)),
  ].slice(0, 6);
  const moversWithExperience = movers.filter((mover) => typeof mover.yearsOperating === "number");
  const averageExperience =
    moversWithExperience.length > 0
      ? Math.round(
          moversWithExperience.reduce((total, mover) => total + (mover.yearsOperating ?? 0), 0) / moversWithExperience.length
        )
      : 0;

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#edf4fb_0%,#f7fafc_38%,#ffffff_100%)] py-10 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[4%] top-12 h-40 w-40 rounded-full bg-sky-200/55 blur-3xl sm:h-64 sm:w-64" />
          <div className="absolute right-[8%] top-16 h-44 w-44 rounded-full bg-emerald-100/75 blur-3xl sm:h-72 sm:w-72" />
          <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),transparent)]" />
        </div>

        <div className="container-shell relative">
          <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(12,21,38,0.96),rgba(37,73,108,0.94))] px-4 py-5 text-white shadow-[0_30px_90px_-48px_rgba(15,23,42,0.55)] sm:rounded-[34px] sm:px-8 sm:py-9 lg:px-12 lg:py-12">
            <div className="grid gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.7fr)] lg:items-end">
              <div className="max-w-3xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100 backdrop-blur sm:text-sm">
                  <Sparkles className="h-4 w-4" />
                  About Match &apos;n Move
                </p>
                <h1 className="mt-4 text-[clamp(2.15rem,10vw,5.4rem)] font-black leading-[0.98] tracking-[-0.035em] text-white sm:mt-5 sm:leading-[0.92] sm:tracking-[-0.06em]">
                  Making moving feel more modern, calm, and connected.
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                  We&apos;re building a cleaner way for customers to discover trusted moving companies and for movers to
                  grow through a platform that feels polished from first click to final quote.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-1">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur sm:rounded-[24px] sm:py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">Mover profiles</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{movers.length}</p>
                  <p className="mt-1 text-sm text-slate-300">Companies currently in the network.</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur sm:rounded-[24px] sm:py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">Successful moves</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{successfulMoves}</p>
                  <p className="mt-1 text-sm text-slate-300">Live count based on leads taken by movers.</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur sm:rounded-[24px] sm:py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-sky-100/75">Avg. experience</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{averageExperience || 0}+</p>
                  <p className="mt-1 text-sm text-slate-300">Years operating across listed movers.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-start">
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_26px_70px_-46px_rgba(15,23,42,0.35)] backdrop-blur sm:rounded-[30px] sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Our team</p>
                  <h2 className="mt-3 text-[clamp(1.75rem,8vw,3.5rem)] font-black leading-[1] tracking-[-0.03em] text-slate-950 sm:leading-[0.95] sm:tracking-[-0.05em]">
                    The team bringing Match &apos;n Move to launch.
                  </h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                  <Camera className="h-4 w-4 text-sky-700" />
                  Meet the team
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:mt-7 sm:gap-4 md:grid-cols-3">
                {teamCards.map((member) => (
                  <article
                    key={member.name}
                    className="group relative overflow-hidden rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-34px_rgba(15,23,42,0.35)] sm:rounded-[26px] sm:p-5"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#38bdf8,#22c55e)] opacity-80" />
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-slate-100 sm:rounded-[22px]">
                      <Image
                        src={member.image}
                        alt={`${member.name}, ${member.title} at Match 'n Move`}
                        fill
                        sizes="(min-width: 768px) 22vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.025]"
                      />
                    </div>
                    <p className="mt-4 text-lg font-bold text-slate-950">{member.name}</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{member.title}</p>
                    <p className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">{member.role}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{member.note}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(145deg,#0f172a,#17324f)] p-4 text-white shadow-[0_28px_74px_-44px_rgba(15,23,42,0.75)] sm:rounded-[30px] sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">Network pulse</p>
              <h2 className="mt-3 text-[clamp(1.75rem,8vw,3.2rem)] font-black leading-[1] tracking-[-0.03em] text-white sm:leading-[0.95] sm:tracking-[-0.05em]">
                Helping customers meet the movers behind each quote.
              </h2>

              <div className="mt-6 grid gap-3">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/10 p-3 text-sky-200">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Real businesses, not just names on a list</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Every mover in the network has a place to show who they are, where they work, and what they care about.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/10 p-3 text-emerald-200">
                      <Users2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Built on trust before the first call</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        We want customers to feel like they already know a little about the people they are inviting into their move.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/10 p-3 text-orange-200">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">A better way to be remembered</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        As more local teams join, this page will help each business feel familiar before a customer reaches out.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {serviceAreas.length > 0 ? (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Service areas in the network</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {serviceAreas.map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-200"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {storyCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.3)] sm:rounded-[30px] sm:p-7"
                >
                  <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">{card.eyebrow}</p>
                  <h3 className="mt-3 max-w-[16ch] text-[clamp(1.55rem,7vw,3rem)] font-black leading-[1] tracking-[-0.025em] text-slate-950 sm:max-w-[14ch] sm:leading-[0.98] sm:tracking-[-0.04em]">
                    {card.title}
                  </h3>
                  <p className="mt-4 max-w-[40rem] text-sm leading-7 text-slate-600 sm:text-base">{card.copy}</p>
                </article>
              );
            })}
          </div>

          <section className="mt-12">
            <div className="mb-6 overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(145deg,#0f172a,#17324f)] p-4 text-white shadow-[0_30px_80px_-46px_rgba(15,23,42,0.7)] sm:mb-8 sm:rounded-[32px] sm:p-7 lg:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">For moving companies</p>
                  <h2 className="mt-3 text-[clamp(1.8rem,8vw,3.8rem)] font-black leading-[1] tracking-[-0.03em] text-white sm:leading-[0.94] sm:tracking-[-0.05em]">
                    Want to join the Match &apos;n Move network?
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    Build your company profile, get in front of high-intent customers, and manage opportunities from one clean dashboard designed for movers.
                  </p>
                </div>

                <Link
                  href="/mover/login"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] px-6 py-3 text-base font-semibold text-white shadow-[0_18px_40px_-24px_rgba(34,197,94,0.8)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_48px_-24px_rgba(34,197,94,0.95)]"
                >
                  Join as a mover
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Partner wall</p>
                <h2 className="mt-3 text-[clamp(1.85rem,8vw,4.2rem)] font-black leading-[1] tracking-[-0.03em] text-slate-950 sm:leading-[0.94] sm:tracking-[-0.05em]">
                  Businesses that grow with us show up here.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  This section starts empty by design. As movers upload their branding inside the dashboard, their logos
                  can appear here automatically.
                </p>
              </div>

              <Link
                href="/mover/login"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] px-6 py-3 text-base font-semibold text-white shadow-[0_18px_40px_-24px_rgba(34,197,94,0.8)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_48px_-24px_rgba(34,197,94,0.95)]"
              >
                Join as a mover
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {moversWithLogos.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {moversWithLogos.map((mover) => (
                  <article
                    key={mover.id}
                    className="group rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_56px_-34px_rgba(15,23,42,0.35)]"
                  >
                    <div className="flex h-20 items-center justify-center rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-4">
                      <img
                        src={mover.logoUrl ?? ""}
                        alt={`${mover.companyName} logo`}
                        className="max-h-12 w-auto max-w-full object-contain"
                      />
                    </div>
                    <p className="mt-4 text-lg font-bold text-slate-950">{mover.companyName}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {mover.serviceAreas.length > 0 ? mover.serviceAreas.slice(0, 2).map(formatServiceAreaLabel).join(" / ") : "Mover profile live"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[24px] border border-dashed border-slate-300 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_100%)] p-5 shadow-[0_18px_46px_-36px_rgba(15,23,42,0.22)] sm:rounded-[30px] sm:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">No partner logos yet</p>
                    <h3 className="mt-3 text-[clamp(1.55rem,7vw,3rem)] font-black leading-[1] tracking-[-0.025em] text-slate-950 sm:leading-[0.98] sm:tracking-[-0.04em]">
                      The showcase will build itself as businesses join.
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                      Right now this area stays intentionally clean. The first logos will appear as soon as movers save
                      them in their dashboard profile.
                    </p>
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current status</p>
                    <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">0</p>
                    <p className="mt-1 text-sm text-slate-500">Logos published to the partner wall.</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </SiteShell>
  );
}
