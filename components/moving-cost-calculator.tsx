"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, CheckCircle2, Info } from "lucide-react";

type RouteType = "local" | "regional" | "long-distance" | "inter-island";
type HomeSize = "small" | "one" | "two" | "three" | "four";
type City = "auckland" | "wellington" | "christchurch" | "other";

const homeRanges: Record<HomeSize, [number, number]> = {
  small: [300, 700],
  one: [400, 900],
  two: [550, 1250],
  three: [700, 1550],
  four: [1100, 2700],
};

const interIslandRanges: Record<HomeSize, [number, number]> = {
  small: [1200, 2800],
  one: [2000, 4000],
  two: [3500, 6500],
  three: [5000, 8500],
  four: [7000, 12000],
};

const routeMultipliers: Record<Exclude<RouteType, "inter-island">, number> = {
  local: 1,
  regional: 1.55,
  "long-distance": 2.4,
};

const cityMultipliers: Record<City, number> = {
  auckland: 1.08,
  wellington: 1.08,
  christchurch: 1,
  other: 1,
};

const currency = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

export function MovingCostCalculator() {
  const [routeType, setRouteType] = useState<RouteType>("local");
  const [homeSize, setHomeSize] = useState<HomeSize>("two");
  const [city, setCity] = useState<City>("other");
  const [packing, setPacking] = useState(false);
  const [difficultAccess, setDifficultAccess] = useState(false);
  const [heavyItem, setHeavyItem] = useState(false);
  const [busyTiming, setBusyTiming] = useState(false);

  const estimate = useMemo(() => {
    let [low, high] =
      routeType === "inter-island"
        ? interIslandRanges[homeSize]
        : homeRanges[homeSize].map((amount) => amount * routeMultipliers[routeType]) as [number, number];

    const cityMultiplier = routeType === "local" ? cityMultipliers[city] : 1;
    low *= cityMultiplier;
    high *= cityMultiplier;

    if (packing) {
      low *= 1.15;
      high *= 1.3;
    }
    if (difficultAccess) {
      low *= 1.1;
      high *= 1.22;
    }
    if (busyTiming) {
      low *= 1.08;
      high *= 1.18;
    }
    if (heavyItem) {
      low += 150;
      high += 800;
    }

    return {
      low: roundEstimate(low),
      high: roundEstimate(high),
    };
  }, [busyTiming, city, difficultAccess, heavyItem, homeSize, packing, routeType]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Build your estimate</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">Tell us about the move</h2>
          </div>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <CalculatorSelect
            id="route-type"
            label="Route type"
            value={routeType}
            onChange={(value) => setRouteType(value as RouteType)}
            options={[
              ["local", "Within the same city or area"],
              ["regional", "Between nearby cities or regions"],
              ["long-distance", "Long-distance, same island"],
              ["inter-island", "Between North and South Islands"],
            ]}
          />
          <CalculatorSelect
            id="home-size"
            label="Approximate load"
            value={homeSize}
            onChange={(value) => setHomeSize(value as HomeSize)}
            options={[
              ["small", "Studio, flat or small load"],
              ["one", "1-bedroom home"],
              ["two", "2-bedroom home"],
              ["three", "3-bedroom home"],
              ["four", "4+ bedroom home"],
            ]}
          />
          <CalculatorSelect
            id="city"
            label="Local market"
            value={city}
            onChange={(value) => setCity(value as City)}
            options={[
              ["auckland", "Auckland"],
              ["wellington", "Wellington"],
              ["christchurch", "Christchurch"],
              ["other", "Elsewhere in New Zealand"],
            ]}
            disabled={routeType !== "local"}
          />
        </div>

        <fieldset className="mt-7">
          <legend className="text-sm font-bold text-slate-900">Possible extras</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <CalculatorCheck
              checked={packing}
              onChange={setPacking}
              label="Professional packing"
              detail="Packing labour and common materials"
            />
            <CalculatorCheck
              checked={difficultAccess}
              onChange={setDifficultAccess}
              label="Difficult access"
              detail="Stairs, long carry, steep drive or limited parking"
            />
            <CalculatorCheck
              checked={heavyItem}
              onChange={setHeavyItem}
              label="Heavy or specialist item"
              detail="For example a piano, safe or oversized appliance"
            />
            <CalculatorCheck
              checked={busyTiming}
              onChange={setBusyTiming}
              label="Busy or short-notice timing"
              detail="Weekend, month-end, holiday or urgent booking"
            />
          </div>
        </fieldset>
      </div>

      <aside className="rounded-[28px] bg-[linear-gradient(145deg,#0f172a,#17324f)] p-6 text-white shadow-[0_28px_70px_-42px_rgba(15,23,42,0.75)] lg:sticky lg:top-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Indicative planning range</p>
        <p className="mt-4 text-[clamp(2.3rem,8vw,3.7rem)] font-black tracking-[-0.06em] text-white">
          {currency.format(estimate.low)}
        </p>
        <p className="text-xl font-bold text-sky-100">to {currency.format(estimate.high)}</p>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          This is a broad budget estimate, not a quote. It cannot see your inventory, exact distance, property access,
          mover availability, storage needs, insurance choice, or required delivery timing.
        </p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-1 h-5 w-5 shrink-0 text-sky-200" />
            <p className="text-sm leading-6 text-slate-200">
              For budgeting, consider keeping another 15% to 25% available until you have a complete written quote.
            </p>
          </div>
        </div>
        <Link
          href="/quote"
          className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950"
        >
          Get quotes for the real job
          <ArrowRight className="h-4 w-4" />
        </Link>
      </aside>
    </div>
  );
}

function roundEstimate(value: number) {
  return Math.max(50, Math.round(value / 50) * 50);
}

function CalculatorSelect({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className={disabled ? "opacity-55" : ""}>
      <span className="mb-2 block text-sm font-bold text-slate-900">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function CalculatorCheck({
  checked,
  onChange,
  label,
  detail,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  detail: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
          checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span>
        <span className="block font-semibold text-slate-900">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-500">{detail}</span>
      </span>
    </label>
  );
}

