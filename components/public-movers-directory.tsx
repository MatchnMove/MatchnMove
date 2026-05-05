"use client";

import { useDeferredValue, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { PublicMoverCard, type PublicMoverCardData } from "@/components/public-mover-card";
import { canonicaliseServiceArea, formatServiceAreaLabel } from "@/lib/nz-regions";

type PublicMoversDirectoryProps = {
  movers: PublicMoverCardData[];
};

function getServiceAreaOptions(movers: PublicMoverCardData[]) {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const mover of movers) {
    for (const area of mover.serviceAreas) {
      const label = formatServiceAreaLabel(area);
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      labels.push(label);
    }
  }

  return labels.sort((left, right) => left.localeCompare(right));
}

function matchesServiceArea(mover: PublicMoverCardData, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;

  const canonicalQuery = canonicaliseServiceArea(trimmedQuery);
  if (canonicalQuery) {
    return mover.serviceAreas.some((area) => canonicaliseServiceArea(area) === canonicalQuery);
  }

  const normalizedQuery = trimmedQuery.toLowerCase();
  return mover.serviceAreas.some((area) => formatServiceAreaLabel(area).toLowerCase().includes(normalizedQuery));
}

export function PublicMoversDirectory({ movers }: PublicMoversDirectoryProps) {
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const serviceAreaOptions = getServiceAreaOptions(movers);
  const filteredMovers = movers.filter((mover) => matchesServiceArea(mover, deferredSearchValue));
  const hasSearch = deferredSearchValue.trim().length > 0;

  return (
    <div className="mt-6 sm:mt-10">
      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.05))] p-4 shadow-[0_24px_60px_-44px_rgba(2,6,23,0.7)] backdrop-blur-xl sm:rounded-[30px] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/80">
              <Sparkles className="h-3.5 w-3.5" />
              Search by service area
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Find movers covering your region, then compare the directory from the strongest public ratings down.
            </p>
          </div>

          <div className="w-full max-w-xl">
            <label htmlFor="mover-service-area-search" className="sr-only">
              Search movers by service area
            </label>
            <div className="flex min-h-[58px] items-center gap-3 rounded-[22px] border border-white/12 bg-slate-950/20 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Search className="h-4 w-4 shrink-0 text-sky-100/80" />
              <input
                id="mover-service-area-search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search Auckland, Wellington, Canterbury..."
                autoComplete="off"
                className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-base"
              />
              {searchValue ? (
                <button
                  type="button"
                  onClick={() => setSearchValue("")}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-200 transition hover:bg-white/[0.1]"
                  aria-label="Clear service area search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {serviceAreaOptions.map((area) => {
            const isActive = area.toLowerCase() === searchValue.trim().toLowerCase();

            return (
              <button
                key={area}
                type="button"
                onClick={() => setSearchValue(isActive ? "" : area)}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-sky-200/40 bg-sky-300/15 text-white"
                    : "border-white/10 bg-white/[0.05] text-slate-200 hover:border-sky-200/25 hover:bg-white/[0.09]"
                }`}
              >
                {area}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing <span className="font-semibold text-white">{filteredMovers.length}</span> mover
            {filteredMovers.length === 1 ? "" : "s"}
            {hasSearch ? (
              <>
                {" "}
                for <span className="font-semibold text-white">{formatServiceAreaLabel(deferredSearchValue)}</span>
              </>
            ) : null}
            .
          </p>
          <p className="text-sky-100/80">Sorted by public rating, highest first.</p>
        </div>
      </div>

      {filteredMovers.length > 0 ? (
        <div className="mt-6 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {filteredMovers.map((mover) => (
            <PublicMoverCard key={mover.id} mover={mover} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[28px] border border-dashed border-white/14 bg-white/[0.05] px-6 py-10 text-center">
          <p className="text-lg font-semibold text-white">No movers found for that service area.</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Try a nearby region or clear the search to browse the full directory of trusted movers.
          </p>
        </div>
      )}
    </div>
  );
}
