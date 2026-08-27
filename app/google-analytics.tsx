"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function GoogleAnalyticsPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!window.gtag || !pathname) {
      return;
    }

    trackAnalyticsEvent("page_view", {
      page_path: pathname,
      page_location: `${window.location.origin}${pathname}`,
      page_title: document.title,
      has_query: searchParams.size > 0,
    });
  }, [pathname, searchParams]);

  return null;
}

function GoogleAnalyticsEngagementEvents() {
  const pathname = usePathname();

  useEffect(() => {
    const viewedSections = new Set<string>();
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const sectionName = (entry.target as HTMLElement).dataset.analyticsSection;
          if (!sectionName || viewedSections.has(sectionName)) continue;
          viewedSections.add(sectionName);
          trackAnalyticsEvent("homepage_section_view", {
            section_name: sectionName,
            page_path: pathname || window.location.pathname,
          });
        }
      },
      { threshold: 0.45 },
    );

    document.querySelectorAll<HTMLElement>("[data-analytics-section]").forEach((section) => sectionObserver.observe(section));

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a");

      if (!link) {
        return;
      }

      const href = link.getAttribute("href") || "";
      const linkText = (link.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const eventParams = {
        link_text: linkText,
        link_url: href,
        page_path: pathname || window.location.pathname,
        source: link.dataset.analyticsSource || undefined,
      };

      if (href.startsWith("tel:")) {
        trackAnalyticsEvent("phone_click", eventParams);
        return;
      }

      if (href.startsWith("mailto:")) {
        trackAnalyticsEvent("email_click", eventParams);
        return;
      }

      if (href === "/quote" || href.startsWith("/quote?")) {
        trackAnalyticsEvent("quote_cta_click", eventParams);
        return;
      }

      if (href === "/contact" || href.startsWith("/contact?")) {
        trackAnalyticsEvent("contact_cta_click", eventParams);
        return;
      }

      if (href === "/movers" || href.startsWith("/movers?")) {
        trackAnalyticsEvent("movers_directory_click", eventParams);
        return;
      }

      if (href === "/resources" || href.startsWith("/resources/")) {
        trackAnalyticsEvent("resource_click", eventParams);
      }
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      sectionObserver.disconnect();
    };
  }, [pathname]);

  return null;
}

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}>
        <GoogleAnalyticsPageViews />
        <GoogleAnalyticsEngagementEvents />
      </Suspense>
    </>
  );
}
