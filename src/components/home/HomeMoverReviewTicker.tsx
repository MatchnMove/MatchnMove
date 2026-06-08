"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Star, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { HeroMoverTickerItem } from "@/src/components/hero/hero-mover-data";

export type HomeMoverReviewItem = HeroMoverTickerItem & {
  profileHref: string;
  hoverLabel?: string;
};

type HomeMoverReviewTickerProps = {
  initialMovers: HomeMoverReviewItem[];
};

type PublicMoversResponse = {
  movers?: unknown;
  source?: unknown;
};

function getVisibleMovers(movers: HomeMoverReviewItem[], startIndex: number) {
  return Array.from({ length: Math.min(3, movers.length) }, (_, offset) => movers[(startIndex + offset) % movers.length]);
}

function formatRating(rating: number) {
  return rating > 0 ? rating.toFixed(1) : "New";
}

function isHeroMoverTickerItem(item: unknown): item is HeroMoverTickerItem {
  if (typeof item !== "object" || item === null) return false;

  const candidate = item as Partial<HeroMoverTickerItem>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    (typeof candidate.logoUrl === "string" || candidate.logoUrl === null) &&
    typeof candidate.rating === "number" &&
    typeof candidate.reviewCount === "number" &&
    typeof candidate.badge === "string" &&
    typeof candidate.tone === "string"
  );
}

export function HomeMoverReviewTicker({ initialMovers }: HomeMoverReviewTickerProps) {
  const [movers, setMovers] = useState(initialMovers);
  const [startIndex, setStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const visibleMovers = useMemo(() => getVisibleMovers(movers, startIndex), [movers, startIndex]);

  useEffect(() => {
    if (movers.length <= 3 || isPaused) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return;

    const interval = window.setInterval(() => {
      setStartIndex((current) => (current + 1) % movers.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isPaused, movers.length]);

  useEffect(() => {
    let cancelled = false;

    const refreshMovers = async () => {
      try {
        const response = await fetch("/api/public-movers", { cache: "no-store" });
        const data = (await response.json()) as PublicMoversResponse;

        if (cancelled || !response.ok || typeof data !== "object" || data === null || !("movers" in data)) {
          return;
        }

        const nextMovers = Array.isArray(data.movers)
          ? data.movers.filter(isHeroMoverTickerItem).map((mover) => ({
              ...mover,
              profileHref: `/movers/${mover.id}`,
            }))
          : [];
        const reviewedMovers = nextMovers.filter((mover) => mover.reviewCount > 0);

        if (data.source === "database" && nextMovers.length) {
          setMovers(reviewedMovers.length ? reviewedMovers : nextMovers);
          setStartIndex(0);
        }
      } catch {
        // Keep the server-rendered list if the refresh cannot complete.
      }
    };

    refreshMovers();

    const interval = window.setInterval(refreshMovers, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (movers.length === 0) return null;

  return (
    <div
      className="relative mx-auto h-[338px] w-full max-w-[560px] overflow-visible sm:h-[368px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-8 h-[282px] rounded-[28px] border border-slate-200 bg-slate-50 shadow-inner sm:top-10 sm:h-[298px]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-sky-200/70" />
      <AnimatePresence initial={false} mode="popLayout">
        {visibleMovers.map((mover, slot) => (
          <motion.div
            key={mover.id}
            layout
            initial={{ opacity: 0, y: 42, scale: 0.97 }}
            animate={{
              opacity: 1,
              y: slot * 108,
              scale: 1 - slot * 0.015,
            }}
            exit={{ opacity: 0, y: -42, scale: 0.97 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-0 px-0 sm:px-3"
          >
            <Link
              href={mover.profileHref}
              className="group mx-auto flex min-h-[94px] w-full max-w-[528px] items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_24px_58px_-34px_rgba(15,23,42,0.38)] transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_30px_68px_-36px_rgba(14,165,233,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 sm:min-h-[104px] sm:gap-4 sm:px-5 sm:py-4"
            >
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm sm:h-14 sm:w-14">
                  {mover.logoUrl ? (
                    <img src={mover.logoUrl} alt={`${mover.name} logo`} className="h-full w-full object-contain" loading="lazy" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center rounded-xl text-white ${mover.tone}`}>
                      <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-black tracking-normal text-slate-950 sm:text-lg">{mover.name}</p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-emerald-700 sm:px-3 sm:text-[0.68rem]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {mover.badge}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="flex items-center justify-end gap-1 text-xl font-black tracking-normal text-slate-950 sm:text-2xl">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400 sm:h-5 sm:w-5" />
                  {formatRating(mover.rating)}
                </div>
                <p className="mt-1 text-[0.68rem] font-bold text-slate-500 sm:text-xs">
                  {mover.reviewCount} review{mover.reviewCount === 1 ? "" : "s"}
                </p>
                <p className="mt-2 hidden text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sky-700 opacity-0 transition group-hover:opacity-100 sm:block">
                  {mover.hoverLabel ?? "View profile"}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
