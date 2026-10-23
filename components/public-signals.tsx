"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics";
export function PublicSignals() {
  const path = usePathname();
  useEffect(() => {
    if (path === "/")
      trackAnalyticsEvent("homepage_viewed", { source: "homepage" });
    else if (path?.startsWith("/movers/"))
      trackAnalyticsEvent("mover_profile_viewed", { source: "mover_profile" });
    else if (path === "/cleaner/register")
      trackAnalyticsEvent("partner_signup_started", { source: "cleaner" });
    else if (
      path === "/mover/login" &&
      new URLSearchParams(window.location.search).get("mode") === "signup"
    )
      trackAnalyticsEvent("partner_signup_started", { source: "mover" });
  }, [path]);
  return null;
}
