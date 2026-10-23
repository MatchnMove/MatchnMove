"use client";
import { safeConversionEvent } from "@/lib/conversion-policy";
type AnalyticsParams = Record<
  string,
  string | number | boolean | null | undefined
>;
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
const emitted = new Set<string>();
export function trackAnalyticsEvent(
  eventName: string,
  params: AnalyticsParams = {},
) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  try {
    if (localStorage.getItem("mm_analytics_opt_out") === "1") return;
  } catch {}
  if (eventName === "page_view") {
    const path = typeof params.page_path === "string" ? params.page_path : "/";
    const safe = path.startsWith("/movers/")
      ? "/movers/profile"
      : path.startsWith("/resources/")
        ? "/resources/article"
        : path.startsWith("/moving-quotes/")
          ? "/moving-quotes/region"
          : path.startsWith("/cleaning-quotes/")
            ? "/cleaning-quotes/region"
            : [
                  "/",
                  "/movers",
                  "/resources",
                  "/cleaning-quotes",
                  "/about",
                  "/trust",
                  "/faq",
                  "/privacy",
                  "/terms",
                ].includes(path)
              ? path
              : "/other";
    window.gtag?.("event", "page_view", {
      page_path: safe,
      page_location: window.location.origin + safe,
    });
    return;
  }
  const event = safeConversionEvent(eventName, params);
  if (!event) return;
  const repeat = event.name === "quote_submission_failed";
  const key = [event.name, event.source, event.step].join(":");
  if (!repeat && emitted.has(key)) return;
  emitted.add(key);
  const payload = { id: crypto.randomUUID(), ...event };
  void fetch("/api/conversion-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
  // Existing GA receives the same bounded fields, never arbitrary form values.
  if (window.gtag)
    window.gtag("event", event.name, {
      source: event.source,
      step: event.step,
    });
}
