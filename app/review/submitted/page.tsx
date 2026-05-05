import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site-shell";

export default async function ReviewSubmittedPage({
  searchParams,
}: {
  searchParams?: Promise<{ mover?: string; status?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const moverName = resolvedSearchParams?.mover ?? "your mover";
  const moderationStatus = resolvedSearchParams?.status ?? "APPROVED";

  const statusConfig =
    moderationStatus === "PENDING"
      ? {
          icon: Clock3,
          iconTone: "bg-amber-50 text-amber-600",
          badgeTone: "border-amber-200 bg-amber-50 text-amber-700",
          badgeLabel: "Review awaiting check",
          title: `Thanks for reviewing ${moverName}`,
          body:
            "Your rating has been received. Because you included written comments that need a quick trust and safety check, they are currently pending review before appearing publicly on Match 'n Move.",
        }
      : moderationStatus === "REJECTED"
        ? {
            icon: AlertCircle,
            iconTone: "bg-rose-50 text-rose-600",
            badgeTone: "border-rose-200 bg-rose-50 text-rose-700",
            badgeLabel: "Review received",
            title: `Thanks for rating ${moverName}`,
            body:
              "Your verified rating has been recorded. Your written comments were held back by our automatic review checks, so they will not appear publicly in their current form.",
          }
        : {
            icon: CheckCircle2,
            iconTone: "bg-emerald-50 text-emerald-600",
            badgeTone: "border-emerald-200 bg-emerald-50 text-emerald-700",
            badgeLabel: "Verified review received",
            title: `Thanks for reviewing ${moverName}`,
            body:
              "Your feedback has been recorded through a secure post-job survey and is now ready to support verified customer ratings on Match 'n Move.",
          };

  const Icon = statusConfig.icon;

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef6fc_0%,#ffffff_100%)] py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[10%] top-16 h-52 w-52 rounded-full bg-sky-200/60 blur-3xl" />
          <div className="absolute right-[9%] top-20 h-56 w-56 rounded-full bg-emerald-100/70 blur-3xl" />
        </div>

        <div className="container-shell relative">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-[34px] border border-slate-200 bg-white p-8 text-center shadow-[0_30px_80px_-42px_rgba(15,23,42,0.3)] sm:p-12">
            <div className={`mx-auto flex h-18 w-18 items-center justify-center rounded-[26px] ${statusConfig.iconTone}`}>
              <Icon className="h-9 w-9" />
            </div>
            <p className={`mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${statusConfig.badgeTone}`}>
              <ShieldCheck className="h-4 w-4" />
              {statusConfig.badgeLabel}
            </p>
            <h1 className="mt-5 text-[clamp(2.2rem,6vw,4rem)] font-black leading-[0.94] tracking-[-0.06em] text-slate-950">
              {statusConfig.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              {statusConfig.body}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/movers"
                className="inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
              >
                Browse movers
              </Link>
              <Link
                href="/quote"
                className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Request another quote
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
