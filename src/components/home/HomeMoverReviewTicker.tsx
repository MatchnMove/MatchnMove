"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Star, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { HeroMoverTickerItem } from "@/src/components/hero/hero-mover-data";

type HomeMoverReviewTickerProps = {
  initialMovers: HeroMoverTickerItem[];
};

type PublicMoversResponse = {
  movers?: unknown;
  source?: unknown;
};

const cardAngles = [-2.8, -1.4, -3.6];
const cardOffsets = [0, 18, 8];

function getVisibleMovers(movers: HeroMoverTickerItem[], startIndex: number) {
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
    }, 4200);

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

        const nextMovers = Array.isArray(data.movers) ? data.movers.filter(isHeroMoverTickerItem) : [];
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
      className="relative mx-auto h-[330px] w-full max-w-[520px] sm:h-[360px] lg:max-w-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <div className="pointer-events-none absolute inset-x-4 top-10 h-[250px] rounded-[34px] border border-white/10 bg-white/[0.06] shadow-[0_40px_90px_-55px_rgba(15,23,42,0.8)] backdrop-blur-xl" />
      <AnimatePresence initial={false} mode="popLayout">
        {visibleMovers.map((mover, slot) => (
          <motion.div
            key={mover.id}
            layout
            initial={{ opacity: 0, y: 44, scale: 0.95, rotate: cardAngles[slot] }}
            animate={{
              opacity: 1,
              y: slot * 96,
              x: cardOffsets[slot],
              scale: 1,
              rotate: cardAngles[slot],
            }}
            exit={{ opacity: 0, y: -46, scale: 0.95, rotate: cardAngles[0] }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-0 w-[calc(100%-18px)] sm:w-[calc(100%-28px)]"
          >
            <Link
              href={`/movers/${mover.id}`}
              className="group flex min-h-[86px] items-center justify-between gap-3 rounded-[22px] border border-white/70 bg-white/95 px-4 py-3 text-left shadow-[0_26px_62px_-34px_rgba(15,23,42,0.62)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-h-[96px] sm:gap-4 sm:rounded-[26px] sm:px-5 sm:py-4"
            >
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[15px] border border-slate-200 bg-white p-1.5 shadow-sm sm:h-14 sm:w-14 sm:rounded-[18px]">
                  {mover.logoUrl ? (
                    <img src={mover.logoUrl} alt={`${mover.name} logo`} className="h-full w-full object-contain" loading="lazy" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center rounded-xl text-white ${mover.tone}`}>
                      <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-black tracking-[-0.02em] text-slate-950 sm:text-lg">{mover.name}</p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.11em] text-emerald-700 sm:px-3 sm:text-[0.68rem]">
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
                  View profile
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
