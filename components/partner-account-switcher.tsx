import Link from "next/link";
import { Building2, Check, Sparkles } from "lucide-react";
import { cx } from "@/lib/utils";

export type PartnerAccessMode = "login" | "signup";

export function PartnerAccountSwitcher({
  active,
  mode,
  onModeChange,
  className,
}: {
  active: "mover" | "cleaner";
  mode: PartnerAccessMode;
  onModeChange?: (mode: PartnerAccessMode) => void;
  className?: string;
}) {
  const options = [
    {
      id: "mover" as const,
      href: `/mover/login?mode=${mode}`,
      icon: Building2,
      title: "Moving company",
      copy: mode === "signup" ? "Create a mover account" : "Access your mover dashboard",
    },
    {
      id: "cleaner" as const,
      href: mode === "signup" ? "/cleaner/register" : "/cleaner/login",
      icon: Sparkles,
      title: "Cleaning company",
      copy: mode === "signup" ? "Create a cleaner account" : "Access your cleaner dashboard",
    },
  ];

  return (
    <section className={cx("rounded-[24px] border border-slate-200 bg-slate-50/80 p-3 sm:p-4", className)} aria-labelledby="partner-type-heading">
      <div className="mb-3 sm:flex sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p id="partner-type-heading" className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Choose your business type
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-600">Movers and cleaners have separate accounts and dashboards.</p>
        </div>
        <p className="mt-2 text-xs font-semibold text-brandBlue sm:mt-0">Match &apos;n Move partner access</p>
      </div>

      <nav aria-label="Choose partner account type" className="grid gap-2 sm:grid-cols-2">
        {options.map(({ id, href, icon: Icon, title, copy }) => {
          const selected = active === id;
          return (
            <Link
              key={id}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={cx(
                "group flex min-h-[76px] items-center gap-3 rounded-[18px] border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
                selected
                  ? id === "mover"
                    ? "border-brandBlue/50 bg-white text-slate-950 shadow-[0_12px_26px_-20px_rgba(47,115,255,0.75)]"
                    : "border-orange-300 bg-white text-slate-950 shadow-[0_12px_26px_-20px_rgba(222,122,58,0.75)]"
                  : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white",
              )}
            >
              <span
                className={cx(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition",
                  id === "mover"
                    ? selected ? "bg-brandBlue text-white" : "bg-indigo-100 text-brandBlue"
                    : selected ? "bg-accentOrange text-white" : "bg-orange-100 text-orange-700",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-black">
                  {title}
                  {selected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white">
                      <Check className="h-3 w-3" aria-hidden="true" /> Selected
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">{copy}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">I want to</p>
        <nav aria-label="Choose sign up or log in" className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-sm font-bold shadow-sm">
          {(["signup", "login"] as const).map((nextMode) => {
            const selected = mode === nextMode;
            const label = nextMode === "signup" ? "Create an account" : "Log in";
            const className = cx(
              "flex min-h-9 items-center justify-center rounded-full px-4 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBlue/30",
              selected ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            );

            return onModeChange ? (
              <button key={nextMode} type="button" onClick={() => onModeChange(nextMode)} className={className} aria-pressed={selected}>
                {label}
              </button>
            ) : (
              <Link
                key={nextMode}
                href={active === "mover" ? `/mover/login?mode=${nextMode}` : nextMode === "signup" ? "/cleaner/register" : "/cleaner/login"}
                className={className}
                aria-current={selected ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
