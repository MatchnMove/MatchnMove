"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Star, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { HeroMoverTickerItem } from "@/src/components/hero/hero-mover-data";

type HeroMoverTickerProps = {
  initialMovers: HeroMoverTickerItem[];
};

const cardAngles = [-4, -3, -5];
const cardOffsets = [0, 12, 24];

type PublicMoversResponse = {
  movers?: unknown;
  source?: unknown;
};

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

export function HeroMoverTicker({ initialMovers }: HeroMoverTickerProps) {
  const [movers, setMovers] = useState(initialMovers);
  const [startIndex, setStartIndex] = useState(0);
  const visibleMovers = useMemo(() => getVisibleMovers(movers, startIndex), [movers, startIndex]);

  useEffect(() => {
    if (movers.length <= 3) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (motionQuery.matches) return;

    const interval = window.setInterval(() => {
      setStartIndex((current) => (current + 1) % movers.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [movers.length]);

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

        if (data.source === "database") {
          setMovers(nextMovers);
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

  if (movers.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute right-[4.5%] top-[11%] z-20 hidden w-[min(28vw,390px)] lg:block">
      <div className="relative h-[290px]">
        <AnimatePresence initial={false} mode="popLayout">
          {visibleMovers.map((mover, slot) => (
            <motion.article
              key={mover.id}
              layout
              initial={{ opacity: 0, y: 36, scale: 0.96, rotate: cardAngles[slot] }}
              animate={{
                opacity: 1,
                y: slot * 94,
                x: cardOffsets[slot],
                scale: 1,
                rotate: cardAngles[slot],
              }}
              exit={{ opacity: 0, y: -42, scale: 0.96, rotate: cardAngles[0] }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 top-0 flex min-h-[78px] w-full items-center justify-between gap-4 rounded-xl bg-white/95 px-4 py-3 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
                  {mover.logoUrl ? (
                    <img
                      src={mover.logoUrl}
                      alt={`${mover.name} logo`}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center rounded-md text-white ${mover.tone}`}>
                      <Truck className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{mover.name}</p>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {mover.badge}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="flex items-center justify-end gap-1 text-lg font-black tracking-normal text-slate-950">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {formatRating(mover.rating)}
                </div>
                <p className="text-[0.64rem] font-bold text-slate-500">
                  {mover.reviewCount} review{mover.reviewCount === 1 ? "" : "s"}
                </p>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
