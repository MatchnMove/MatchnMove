"use client";
import type { ReactNode } from "react";
import { PartnerAuthShell, partnerButtonClass, partnerInputClass } from "@/components/partner-auth-shell";
import type { PartnerAccessMode } from "@/components/partner-account-switcher";

export function CleanerAuthShell({ title, description, children }: {
  eyebrow: string; title: string; description: string; accessMode?: PartnerAccessMode; children: ReactNode;
}) {
  return <PartnerAuthShell><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>{children}</PartnerAuthShell>;
}
export const cleanerInputClass = partnerInputClass;
export const cleanerPrimaryButtonClass = partnerButtonClass;
export function CleanerFormNotice({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  return <p role={kind === "error" ? "alert" : "status"} className={`mt-4 rounded-lg px-3 py-2.5 text-sm leading-6 ${kind === "error" ? "bg-red-50 text-red-800" : kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800"}`}>{children}</p>;
}
