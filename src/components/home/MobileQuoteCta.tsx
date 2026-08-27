"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export function MobileQuoteCta() {
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-analytics-section='homepage_hero']");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyCta(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
      },
      { threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      data-mobile-quote-cta
      aria-hidden={!showStickyCta}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_50px_-30px_rgba(2,6,23,0.8)] backdrop-blur-xl transition duration-300 md:hidden ${
        showStickyCta ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">Ready to compare movers?</p>
          <p className="mt-0.5 flex items-center gap-1 text-[0.68rem] font-semibold text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Free and no obligation
          </p>
        </div>
        <Link
          href="/quote"
          data-analytics-source="homepage_mobile_sticky"
          className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(110deg,#f7931e,#ffad38)] px-4 py-2.5 text-sm font-extrabold text-[#07162b] shadow-[0_14px_28px_-16px_rgba(247,147,30,0.9)]"
        >
          Get free quotes
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
