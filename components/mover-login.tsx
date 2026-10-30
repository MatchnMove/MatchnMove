"use client";
import { PartnerAuth } from "@/components/partner-auth";
import { useMoverApp } from "@/components/mover-app-provider";
import type { PartnerAuthMode } from "@/lib/partner-auth-navigation";

export function MoverLogin({ dedicated = false, initialMode = "login" }: { dedicated?: boolean; initialMode?: PartnerAuthMode }) {
  const { installed } = useMoverApp();
  return <PartnerAuth business="mover" initialMode={initialMode} appMode={dedicated || installed} />;
}
