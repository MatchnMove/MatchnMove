"use client";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackAnalyticsEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("event", eventName, params);
}
