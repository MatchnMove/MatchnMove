"use client";

import { useMemo, useState } from "react";
import { BarChart3, Inbox } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type CleanerTrendLead = {
  createdAt: string;
  purchasedAt: string | null;
  updatedAt?: string;
  status: string;
};

type TrendRange = 7 | 30 | 90;
type SeriesKey = "received" | "opened" | "won";

type TrendPoint = {
  start: Date;
  label: string;
  received: number;
  opened: number;
  won: number;
};

const CHART_WIDTH = 760;
const CHART_HEIGHT = 250;
const CHART_PADDING = { top: 18, right: 18, bottom: 42, left: 38 };
const DAY_MS = 24 * 60 * 60 * 1000;

const series: Array<{ key: SeriesKey; label: string; colour: string }> = [
  { key: "received", label: "Received", colour: "#2f73ff" },
  { key: "opened", label: "Opened", colour: "#f59e0b" },
  { key: "won", label: "Won", colour: "#16a34a" },
];

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildPath(values: number[], maxValue: number) {
  const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  return values
    .map((value, index) => {
      const x = CHART_PADDING.left + (values.length === 1 ? innerWidth / 2 : (index / (values.length - 1)) * innerWidth);
      const y = CHART_PADDING.top + innerHeight - (value / maxValue) * innerHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function CleanerLeadTrendsCard({ leads, loading = false }: { leads: CleanerTrendLead[]; loading?: boolean }) {
  const { t, formatDate, formatNumber } = useLanguage();
  const [range, setRange] = useState<TrendRange>(30);

  const points = useMemo(() => {
    const bucketCount = range === 7 ? 7 : range === 30 ? 10 : 9;
    const bucketDays = range / bucketCount;
    const today = startOfDay(new Date());
    const periodEnd = new Date(today.getTime() + DAY_MS);
    const periodStart = new Date(periodEnd.getTime() - range * DAY_MS);

    const buckets: TrendPoint[] = Array.from({ length: bucketCount }, (_, index) => {
      const start = new Date(periodStart.getTime() + index * bucketDays * DAY_MS);
      return {
        start,
        label: formatDate(start, range === 7 ? { weekday: "short" } : { day: "numeric", month: "short" }),
        received: 0,
        opened: 0,
        won: 0,
      };
    });

    function increment(timestamp: Date | null, key: SeriesKey) {
      if (!timestamp || timestamp < periodStart || timestamp >= periodEnd) return;
      const rawIndex = Math.floor((timestamp.getTime() - periodStart.getTime()) / (bucketDays * DAY_MS));
      const index = Math.min(bucketCount - 1, Math.max(0, rawIndex));
      buckets[index][key] += 1;
    }

    for (const lead of leads) {
      increment(parseTimestamp(lead.createdAt), "received");
      increment(parseTimestamp(lead.purchasedAt), "opened");
      if (lead.status === "WON") {
        increment(parseTimestamp(lead.updatedAt) ?? parseTimestamp(lead.purchasedAt) ?? parseTimestamp(lead.createdAt), "won");
      }
    }

    return buckets;
  }, [formatDate, leads, range]);

  const totals = useMemo(
    () => points.reduce(
      (current, point) => ({
        received: current.received + point.received,
        opened: current.opened + point.opened,
        won: current.won + point.won,
      }),
      { received: 0, opened: 0, won: 0 },
    ),
    [points],
  );
  const maxValue = Math.max(1, ...points.flatMap((point) => series.map(({ key }) => point[key])));
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const translatedSeries = series.map((item) => ({ ...item, label: t(`cleanerDashboard.trend${item.key[0].toUpperCase()}${item.key.slice(1)}`) }));
  const hasData = totals.received + totals.opened + totals.won > 0;

  return (
    <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="cleaner-trends-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-brandBlue">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h2 id="cleaner-trends-title" className="text-xl font-black tracking-[-0.03em] text-slate-950">{t("cleanerDashboard.trendsTitle")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("cleanerDashboard.trendsCopy")}</p>
          </div>
        </div>
        <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1" role="group" aria-label={t("cleanerDashboard.trendsPeriod")}>
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={range === days}
              onClick={() => setRange(days)}
              className={`min-h-9 rounded-lg px-3 text-xs font-bold transition ${range === days ? "bg-white text-brandBlue shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              {days} {t("cleanerDashboard.days")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 sm:max-w-lg">
        {translatedSeries.map(({ key, label, colour }) => (
          <div key={key} className="min-w-0 text-center sm:text-left">
            <p className="flex items-center justify-center gap-1.5 truncate text-[0.68rem] font-bold uppercase tracking-[0.08em] text-slate-500 sm:justify-start">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colour }} />{label}
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">{loading ? "—" : formatNumber(totals[key])}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-4 min-h-[15rem] overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {loading ? <div className="absolute inset-0 z-10 animate-pulse bg-slate-100/80" aria-label={t("cleanerDashboard.trendLoading")} /> : null}
        <svg
          className="h-auto min-h-[15rem] w-full"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={t("cleanerDashboard.trendAria", { range, received: totals.received, opened: totals.opened, won: totals.won })}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = CHART_PADDING.top + innerHeight - fraction * innerHeight;
            return (
              <g key={fraction}>
                <line x1={CHART_PADDING.left} x2={CHART_WIDTH - CHART_PADDING.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={fraction === 0 ? undefined : "4 5"} />
                <text x={CHART_PADDING.left - 9} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(maxValue * fraction)}</text>
              </g>
            );
          })}
          {points.map((point, index) => {
            const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
            const x = CHART_PADDING.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
            return <text key={point.start.toISOString()} x={x} y={CHART_HEIGHT - 14} textAnchor="middle" fontSize="10" fill="#64748b">{point.label}</text>;
          })}
          {series.map(({ key, colour }) => (
            <path key={key} d={buildPath(points.map((point) => point[key]), maxValue)} fill="none" stroke={colour} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
        {!loading && !hasData ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-sm">
              <Inbox className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 text-sm font-bold text-slate-800">{t("cleanerDashboard.trendEmpty")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t("cleanerDashboard.trendEmptyCopy")}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
