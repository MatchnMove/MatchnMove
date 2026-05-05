import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Building2, CheckCircle2, FileText, Route, ShieldCheck, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site-shell";

const pricingLevers = [
  {
    title: "Free mover membership",
    price: "$0/month",
    description: "Join the platform, complete your profile, and review lead opportunities without paying a subscription.",
  },
  {
    title: "Base lead price",
    price: "$20 NZD",
    description: "Every standard local move starts from a clear $20 base price.",
  },
  {
    title: "Billed monthly",
    price: "Invoice",
    description: "Movers unlock leads immediately and settle the total with a month-end invoice instead of paying per unlock on the spot.",
  },
] as const;

const modifierRows = [
  {
    label: "Local move",
    amount: "$20",
    detail: "Standard local jobs begin at the base rate.",
  },
  {
    label: "Large home",
    amount: "+$10",
    detail: "Applied when the move is for a larger home and the quoting workload is heavier.",
  },
  {
    label: "Urgent move",
    amount: "+$20",
    detail: "Applied to short-notice jobs that need faster response and scheduling.",
  },
  {
    label: "Long haul across island",
    amount: "+$20",
    detail: "Applied to longer same-island routes that take more planning and transport time.",
  },
  {
    label: "Between islands",
    amount: "+$45",
    detail: "Applied when the move crosses between the North and South Islands.",
  },
] as const;

const invoiceFlow = [
  {
    title: "See the lead price first",
    description: "The dashboard shows the lead price before the mover opens the full customer details.",
  },
  {
    title: "Unlock immediately",
    description: "There is no per-lead checkout flow. The mover can open the lead right away.",
  },
  {
    title: "Charges are tracked automatically",
    description: "Each unlocked lead is recorded so the finance trail stays clear for support and billing.",
  },
  {
    title: "Receive one invoice at month end",
    description: "Instead of paying lead by lead, movers receive a combined invoice for the month.",
  },
] as const;

const valuePillars = [
  {
    icon: Route,
    title: "Faster dispatch decisions",
    description: "Office teams can open the opportunity immediately instead of stopping to pay first.",
  },
  {
    icon: BadgeDollarSign,
    title: "Simple cost model",
    description: "The rules are easy to explain: $20 base price plus a small number of fixed modifiers.",
  },
  {
    icon: Building2,
    title: "Built for real operators",
    description: "Owners, dispatchers, and on-road staff can understand the pricing at a glance from any device.",
  },
  {
    icon: ShieldCheck,
    title: "Clear audit trail",
    description: "Lead access and billing records stay visible so finance and support can verify what happened.",
  },
] as const;

const securityLayers = [
  {
    icon: ShieldCheck,
    title: "Assigned-lead access",
    description: "Only the mover company attached to the lead can unlock and work that opportunity.",
  },
  {
    icon: FileText,
    title: "Invoice-ready records",
    description: "Unlocked leads are stored as billing entries so month-end invoicing can be checked easily.",
  },
  {
    icon: CheckCircle2,
    title: "Server-side state changes",
    description: "Lead status changes and unlock events are written on the server, not just in the browser.",
  },
  {
    icon: Sparkles,
    title: "Cleaner commercial flow",
    description: "The mover journey focuses on response speed and trust instead of interrupting the workflow with checkout.",
  },
] as const;

export default function MoverPricingPage() {
  return (
    <SiteShell>
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f5f8fc_18%,#eef5fb_100%)]">
        <div className="container-shell py-12 sm:py-14 lg:py-20">
          <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(135deg,#061525_0%,#0e2740_48%,#17344d_100%)] text-white shadow-[0_32px_100px_-45px_rgba(15,23,42,0.72)]">
            <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] xl:px-10 xl:py-12">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                  <Sparkles className="h-4 w-4" />
                  Mover pricing and invoicing
                </p>
                <h1 className="mt-5 max-w-[12ch] text-[clamp(2.7rem,7vw,5.2rem)] font-black leading-[0.9] tracking-[-0.07em] text-white">
                  Instant lead access with one clear invoice at month end.
                </h1>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  Match &apos;n Move is free to join for movers. Leads no longer require a payment at unlock time. Your team
                  can open the lead immediately, and the month&apos;s total is invoiced later in one simple billing cycle.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/mover/login"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-accentOrange px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-orange-500"
                  >
                    Join as a mover
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/mover/dashboard"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Open dashboard
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                {pricingLevers.map((item) => (
                  <div key={item.title} className="rounded-[26px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-sky-200">{item.price}</p>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {valuePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="inline-flex rounded-2xl bg-sky-100 p-3 text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-xl font-black tracking-[-0.03em] text-slate-950">{pillar.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{pillar.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">Detailed pricing structure</p>
              <h2 className="mt-3 text-[clamp(2rem,4vw,3.4rem)] font-black tracking-[-0.05em] text-slate-950">
                What shapes each lead price
              </h2>
              <div className="mt-6 space-y-3">
                {modifierRows.map((row) => (
                  <div key={row.label} className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{row.label}</p>
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-600">{row.amount}</p>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{row.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#fff8ef,#ffffff)] p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">Mover-friendly policy</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                <p>No subscription is required to start using the platform.</p>
                <p>No checkout step blocks the mover from opening the lead.</p>
                <p>The lead price is shown before unlock so the team knows what will appear on the invoice.</p>
                <p>Pricing uses fixed rules instead of vague variable charges.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,1fr)]">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">How billing works</p>
              <h2 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[-0.05em] text-slate-950">
                A straightforward unlock-now, invoice-later flow
              </h2>
              <div className="mt-6 space-y-3">
                {invoiceFlow.map((step, index) => (
                  <div key={step.title} className="flex gap-4 rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#081a2b,#102845)] p-6 text-white shadow-sm sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">Security and trust</p>
              <h2 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[-0.05em] text-white">
                The billing trail stays easy to verify.
              </h2>
              <div className="mt-6 space-y-3">
                {securityLayers.map((layer) => {
                  const Icon = layer.icon;
                  return (
                    <div key={layer.title} className="rounded-[26px] border border-white/10 bg-white/[0.06] p-4">
                      <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-white/10 p-3 text-sky-100">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{layer.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-slate-300">{layer.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
