"use client";

import { useState } from "react";
import { Check, ChevronDown, MapPinned } from "lucide-react";
import { NZ_SERVICE_AREAS, NZ_SERVICE_AREA_GROUPS, NZ_SERVICE_AREA_LOCALITIES, type NzServiceArea } from "@/lib/nz-regions";
import { cx } from "@/lib/utils";

type NzRegionSelectorProps = {
  selectedRegions: NzServiceArea[];
  onChange: (regions: NzServiceArea[]) => void;
  title?: string;
  description?: string;
  className?: string;
};

export function NzRegionSelector({
  selectedRegions,
  onChange,
  title = "Coverage regions",
  description = "Choose the NZ regions your moving business actively services.",
  className,
}: NzRegionSelectorProps) {
  const [openRegion, setOpenRegion] = useState<NzServiceArea | null>(null);
  const selectedSet = new Set(selectedRegions);

  function sortRegions(regions: Iterable<NzServiceArea>) {
    const regionSet = new Set(regions);
    return NZ_SERVICE_AREAS.filter((region) => regionSet.has(region));
  }

  function toggleRegion(region: NzServiceArea) {
    if (selectedSet.has(region)) {
      onChange(selectedRegions.filter((item) => item !== region));
      return;
    }

    onChange(sortRegions([...selectedRegions, region]));
  }

  function setGroup(regions: readonly NzServiceArea[]) {
    onChange(sortRegions(regions));
  }

  return (
    <div className={cx("rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[24px] sm:p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          <MapPinned className="h-3.5 w-3.5 text-sky-700" />
          {selectedRegions.length} selected
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([...NZ_SERVICE_AREAS])}
          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Nationwide
        </button>
        {NZ_SERVICE_AREA_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setGroup(group.regions)}
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {group.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange([])}
          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
        >
          Clear
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {NZ_SERVICE_AREA_GROUPS.map((group) => (
          <div key={group.id} className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[22px] sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                <p className="mt-1 text-xs text-slate-500">{group.regions.length} official regions</p>
              </div>
              <button
                type="button"
                onClick={() => setGroup(group.regions)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Select all
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {group.regions.map((region) => {
                const selected = selectedSet.has(region);
                const expanded = openRegion === region;
                const localities = NZ_SERVICE_AREA_LOCALITIES[region];

                return (
                  <div
                    key={region}
                    className={cx(
                      "overflow-hidden rounded-2xl border transition",
                      selected
                        ? "border-sky-200 bg-[linear-gradient(180deg,#f4fbff_0%,#ffffff_100%)] shadow-[0_14px_34px_-28px_rgba(14,165,233,0.35)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button type="button" onClick={() => toggleRegion(region)} className="flex min-w-0 flex-1 items-center justify-between text-left">
                        <span className="text-sm font-semibold text-slate-800">{region}</span>
                        <span
                          className={cx(
                            "ml-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                            selected ? "border-sky-200 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent",
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenRegion((current) => (current === region ? null : region))}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        aria-expanded={expanded}
                      >
                        Areas
                        <ChevronDown className={cx("h-3.5 w-3.5 transition", expanded ? "rotate-180" : "")} />
                      </button>
                    </div>

                    {expanded ? (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                        <p className="text-xs leading-5 text-slate-500">
                          Includes common lead locations such as:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {localities.map((locality) => (
                            <button
                              key={locality}
                              type="button"
                              onClick={() => {
                                if (!selectedSet.has(region)) onChange(sortRegions([...selectedRegions, region]));
                              }}
                              className={cx(
                                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                                selected
                                  ? "border-sky-100 bg-white text-sky-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700",
                              )}
                            >
                              {locality}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
