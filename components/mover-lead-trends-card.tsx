"use client";

import { ArrowDownRight, ArrowUpRight, ChevronDown, LineChart, Minus, TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";
import { cx } from "@/lib/utils";

type LeadTrendLead = {
  id: string;
  createdAt: string;
};

type LeadTrendView = "ALL" | "Q1" | "Q2" | "Q3" | "Q4";

type QuarterKey = Exclude<LeadTrendView, "ALL">;

type MonthlyLeadPoint = {
  monthIndex: number;
  label: string;
  shortLabel: string;
  count: number;
  quarter: QuarterKey;
};

type LeadTrendsCardProps = {
  leads: LeadTrendLead[];
  isLoading?: boolean;
  className?: string;
};

const DASHBOARD_TIMEZONE = "Pacific/Auckland";
const MONTHS = [
  { label: "January", shortLabel: "Jan" },
  { label: "February", shortLabel: "Feb" },
  { label: "March", shortLabel: "Mar" },
  { label: "April", shortLabel: "Apr" },
  { label: "May", shortLabel: "May" },
  { label: "June", shortLabel: "Jun" },
  { label: "July", shortLabel: "Jul" },
  { label: "August", shortLabel: "Aug" },
  { label: "September", shortLabel: "Sep" },
  { label: "October", shortLabel: "Oct" },
  { label: "November", shortLabel: "Nov" },
  { label: "December", shortLabel: "Dec" },
] as const;

const QUARTERS: Array<{
  id: QuarterKey;
  label: string;
  detail: string;
  startMonth: number;
  endMonth: number;
  stroke: string;
  fill: string;
  fillSoft: string;
  text: string;
}> = [
  { id: "Q1", label: "Q1", detail: "January to March", startMonth: 0, endMonth: 2, stroke: "#55b9db", fill: "#5ec0df", fillSoft: "#dbf2f9", text: "#2a819c" },
  { id: "Q2", label: "Q2", detail: "April to June", startMonth: 3, endMonth: 5, stroke: "#63a96d", fill: "#74ba7c", fillSoft: "#e4f4e7", text: "#3f8b4c" },
  { id: "Q3", label: "Q3", detail: "July to September", startMonth: 6, endMonth: 8, stroke: "#ea9b30", fill: "#f2aa3b", fillSoft: "#fdf0d9", text: "#b96e07" },
  { id: "Q4", label: "Q4", detail: "October to December", startMonth: 9, endMonth: 11, stroke: "#294f80", fill: "#2f5d96", fillSoft: "#e0e9f4", text: "#294f80" },
];

const VIEW_OPTIONS: Array<{
  id: LeadTrendView;
  label: string;
}> = [
  { id: "ALL", label: "Year" },
  { id: "Q1", label: "Q1" },
  { id: "Q2", label: "Q2" },
  { id: "Q3", label: "Q3" },
  { id: "Q4", label: "Q4" },
];

const monthYearFormatter = new Intl.DateTimeFormat("en-NZ", {
  month: "numeric",
  year: "numeric",
  timeZone: DASHBOARD_TIMEZONE,
});

const numberFormatter = new Intl.NumberFormat("en-NZ");

function getLeadDateParts(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const parts = monthYearFormatter.formatToParts(parsed);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0) - 1;
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);

  if (month < 0 || month > 11 || !year) return null;

  return { month, year };
}

function getQuarterForMonth(monthIndex: number): QuarterKey {
  if (monthIndex <= 2) return "Q1";
  if (monthIndex <= 5) return "Q2";
  if (monthIndex <= 8) return "Q3";
  return "Q4";
}

function getAvailableYears(leads: LeadTrendLead[]) {
  const uniqueYears = new Set<number>();

  for (const lead of leads) {
    const parts = getLeadDateParts(lead.createdAt);
    if (parts) uniqueYears.add(parts.year);
  }

  return Array.from(uniqueYears).sort((left, right) => right - left);
}

function buildMonthlySeries(leads: LeadTrendLead[], selectedYear: number) {
  const months: MonthlyLeadPoint[] = MONTHS.map((month, monthIndex) => ({
    monthIndex,
    label: month.label,
    shortLabel: month.shortLabel,
    count: 0,
    quarter: getQuarterForMonth(monthIndex),
  }));

  for (const lead of leads) {
    const parts = getLeadDateParts(lead.createdAt);
    if (!parts || parts.year !== selectedYear) continue;
    months[parts.month].count += 1;
  }

  return months;
}

function getQuarterConfig(quarter: QuarterKey) {
  return QUARTERS.find((item) => item.id === quarter) ?? QUARTERS[0];
}

function isMonthInsideView(monthIndex: number, view: LeadTrendView) {
  if (view === "ALL") return true;
  const quarter = getQuarterConfig(view);
  return monthIndex >= quarter.startMonth && monthIndex <= quarter.endMonth;
}

function getDefaultActiveMonthIndex(months: MonthlyLeadPoint[], view: LeadTrendView) {
  const visibleMonths = months.filter((month) => isMonthInsideView(month.monthIndex, view));
  if (!visibleMonths.length) return 0;

  return visibleMonths.reduce((best, month) => {
    if (month.count > best.count) return month;
    if (month.count === best.count && month.monthIndex > best.monthIndex) return month;
    return best;
  }, visibleMonths[0]).monthIndex;
}

function getQuarterTotals(months: MonthlyLeadPoint[]) {
  return QUARTERS.map((quarter) => ({
    ...quarter,
    total: months
      .filter((month) => month.quarter === quarter.id)
      .reduce((sum, month) => sum + month.count, 0),
  }));
}

function getScaleMax(maxCount: number) {
  if (maxCount <= 4) return 4;
  const padded = Math.ceil(maxCount * 1.15);
  return Math.ceil(padded / 4) * 4;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baselineY: number) {
  if (!points.length) return "";
  return `${buildSmoothPath(points)} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function buildQuarterBarGradient(quarters: Array<{ fill: string; total: number }>, total: number) {
  if (!total) return "linear-gradient(90deg, #e2e8f0 0%, #e2e8f0 100%)";

  const visibleQuarters = quarters.filter((quarter) => quarter.total > 0);
  if (!visibleQuarters.length) return "linear-gradient(90deg, #e2e8f0 0%, #e2e8f0 100%)";
  if (visibleQuarters.length === 1) return `linear-gradient(90deg, ${visibleQuarters[0].fill} 0%, ${visibleQuarters[0].fill} 100%)`;

  const blend = 1.2;
  const stops: string[] = [];
  let cumulative = 0;

  stops.push(`${visibleQuarters[0].fill} 0%`);

  for (let index = 0; index < visibleQuarters.length - 1; index += 1) {
    const current = visibleQuarters[index];
    const next = visibleQuarters[index + 1];
    cumulative += (current.total / total) * 100;

    const left = Math.max(0, cumulative - blend);
    const right = Math.min(100, cumulative + blend);

    stops.push(`${current.fill} ${left}%`);
    stops.push(`${next.fill} ${right}%`);
  }

  stops.push(`${visibleQuarters[visibleQuarters.length - 1].fill} 100%`);

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function buildLineGradientStops() {
  const boundaries = [2.5, 5.5, 8.5];
  const blend = 1.8;
  const maxIndex = MONTHS.length - 1;
  const stops: Array<{ offset: string; color: string }> = [{ offset: "0%", color: QUARTERS[0].stroke }];

  boundaries.forEach((boundary, index) => {
    const boundaryPercent = (boundary / maxIndex) * 100;
    const left = Math.max(0, boundaryPercent - blend);
    const right = Math.min(100, boundaryPercent + blend);

    stops.push({ offset: `${left}%`, color: QUARTERS[index].stroke });
    stops.push({ offset: `${right}%`, color: QUARTERS[index + 1].stroke });
  });

  stops.push({ offset: "100%", color: QUARTERS[QUARTERS.length - 1].stroke });
  return stops;
}

function getQuarterTotal(months: MonthlyLeadPoint[], quarterId: QuarterKey) {
  return months.filter((month) => month.quarter === quarterId).reduce((sum, month) => sum + month.count, 0);
}

function getViewTotal(months: MonthlyLeadPoint[], view: LeadTrendView) {
  return months.filter((month) => isMonthInsideView(month.monthIndex, view)).reduce((sum, month) => sum + month.count, 0);
}

function formatDelta(delta: number) {
  const rounded = Math.round(Math.abs(delta));
  return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${rounded}%`;
}

function getInsightData(params: {
  selectedView: LeadTrendView;
  effectiveYear: number;
  availableYears: number[];
  monthlySeries: MonthlyLeadPoint[];
  monthlySeriesByYear: Map<number, MonthlyLeadPoint[]>;
  quarterTotals: Array<{ id: QuarterKey; total: number }>;
}) {
  const { selectedView, effectiveYear, availableYears, monthlySeries, monthlySeriesByYear, quarterTotals } = params;

  if (selectedView === "ALL") {
    const previousYear = availableYears.find((year) => year < effectiveYear);
    if (previousYear) {
      const previousSeries = monthlySeriesByYear.get(previousYear) ?? [];
      const current = getViewTotal(monthlySeries, "ALL");
      const previous = getViewTotal(previousSeries, "ALL");

      if (previous > 0) {
        const delta = ((current - previous) / previous) * 100;
        return {
          delta,
          label: `vs ${previousYear}`,
          detail: `${formatNumber(previous)} leads last year`,
        };
      }
    }

    const nonEmptyQuarters = quarterTotals.filter((quarter) => quarter.total > 0);
    if (nonEmptyQuarters.length >= 2) {
      const currentQuarter = nonEmptyQuarters[nonEmptyQuarters.length - 1];
      const previousQuarter = nonEmptyQuarters[nonEmptyQuarters.length - 2];

      if (previousQuarter.total > 0) {
        const delta = ((currentQuarter.total - previousQuarter.total) / previousQuarter.total) * 100;
        return {
          delta,
          label: `${currentQuarter.id} vs ${previousQuarter.id}`,
          detail: `${formatNumber(currentQuarter.total)} vs ${formatNumber(previousQuarter.total)} leads`,
        };
      }
    }

    return {
      delta: 0,
      label: "Benchmark building",
      detail: "More lead history will sharpen trend insights",
    };
  }

  const currentQuarterIndex = QUARTERS.findIndex((quarter) => quarter.id === selectedView);
  const current = getQuarterTotal(monthlySeries, selectedView);

  let previousTotal = 0;
  let previousLabel = "";

  if (currentQuarterIndex > 0) {
    const previousQuarter = QUARTERS[currentQuarterIndex - 1];
    previousTotal = getQuarterTotal(monthlySeries, previousQuarter.id);
    previousLabel = previousQuarter.id;
  } else {
    const previousYear = availableYears.find((year) => year < effectiveYear);
    if (previousYear) {
      previousTotal = getQuarterTotal(monthlySeriesByYear.get(previousYear) ?? [], selectedView);
      previousLabel = `${selectedView} ${previousYear}`;
    }
  }

  if (previousTotal > 0) {
    const delta = ((current - previousTotal) / previousTotal) * 100;
    return {
      delta,
      label: `vs ${previousLabel}`,
      detail: `${formatNumber(previousTotal)} leads in comparison period`,
    };
  }

  if (current > 0) {
    return {
      delta: 100,
      label: "Fresh activity",
      detail: "No previous benchmark recorded for this window",
    };
  }

  return {
    delta: 0,
    label: "Quiet period",
    detail: "No leads recorded in this quarter yet",
  };
}

function getGhostBarHeight(count: number, scaleMax: number, monthIndex: number) {
  const baseline = scaleMax * (0.44 + (monthIndex % 4) * 0.05);
  return Math.max(count * 0.78, baseline);
}

function getTooltipAlignment(monthIndex: number) {
  if (monthIndex <= 1) return "left";
  if (monthIndex >= 10) return "right";
  return "center";
}

export function MoverLeadTrendsCard({ leads, isLoading = false, className }: LeadTrendsCardProps) {
  const gradientId = useId().replace(/:/g, "");
  const availableYears = getAvailableYears(leads);
  const fallbackYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(availableYears[0] ?? fallbackYear);
  const [selectedView, setSelectedView] = useState<LeadTrendView>("ALL");
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);

  const effectiveYear = availableYears.includes(selectedYear) ? selectedYear : availableYears[0] ?? fallbackYear;
  const monthlySeriesByYear = new Map(availableYears.map((year) => [year, buildMonthlySeries(leads, year)]));
  const monthlySeries = buildMonthlySeries(leads, effectiveYear);
  const defaultActiveMonthIndex = getDefaultActiveMonthIndex(monthlySeries, selectedView);
  const resolvedActiveMonthIndex =
    monthlySeries[activeMonthIndex] && isMonthInsideView(activeMonthIndex, selectedView) ? activeMonthIndex : defaultActiveMonthIndex;
  const activeMonth = monthlySeries[resolvedActiveMonthIndex] ?? monthlySeries[0];
  const quarterTotals = getQuarterTotals(monthlySeries);
  const totalLeads = monthlySeries.reduce((sum, month) => sum + month.count, 0);
  const barGradient = buildQuarterBarGradient(quarterTotals, totalLeads);
  const visibleMonths = monthlySeries.filter((month) => isMonthInsideView(month.monthIndex, selectedView));
  const visibleTotal = visibleMonths.reduce((sum, month) => sum + month.count, 0);
  const maxCount = Math.max(...monthlySeries.map((month) => month.count), 0);
  const scaleMax = getScaleMax(maxCount);
  const lineGradientStops = buildLineGradientStops();
  const insight = getInsightData({
    selectedView,
    effectiveYear,
    availableYears,
    monthlySeries,
    monthlySeriesByYear,
    quarterTotals,
  });

  const chartWidth = 820;
  const chartHeight = 360;
  const chartPadding = { top: 24, right: 18, bottom: 80, left: 52 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const stepX = plotWidth / Math.max(monthlySeries.length - 1, 1);

  const points = monthlySeries.map((month) => ({
    x: chartPadding.left + stepX * month.monthIndex,
    y: chartPadding.top + plotHeight - (month.count / scaleMax) * plotHeight,
    quarter: month.quarter,
    count: month.count,
    monthIndex: month.monthIndex,
  }));

  const tooltipAlignment = getTooltipAlignment(resolvedActiveMonthIndex);
  const activeQuarter = getQuarterConfig(activeMonth?.quarter ?? "Q1");
  const activePoint = points[resolvedActiveMonthIndex] ?? points[0];
  const yTicks = Array.from({ length: 6 }, (_, index) => Math.round((scaleMax / 5) * (5 - index)));
  const areaPath = buildAreaPath(points, chartPadding.top + plotHeight);
  const totalLeadDisplay = selectedView === "ALL" ? totalLeads : visibleTotal;
  const insightTone =
    insight.delta > 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : insight.delta < 0
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  if (isLoading) {
    return (
      <section className={cx("rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-sm sm:rounded-[32px] sm:p-6", className)}>
        <div className="animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-8 w-52 rounded-2xl bg-slate-200" />
              <div className="h-4 w-80 max-w-full rounded-full bg-slate-100" />
            </div>
            <div className="h-12 w-64 rounded-2xl bg-slate-200" />
          </div>
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-4">
            <div className="grid gap-4 lg:grid-cols-[170px_minmax(0,1fr)]">
              <div className="h-20 rounded-[18px] bg-slate-100" />
              <div className="space-y-3">
                <div className="h-6 w-52 rounded-full bg-slate-100" />
                <div className="h-8 rounded-2xl bg-slate-200" />
              </div>
            </div>
            <div className="mt-6 h-[340px] rounded-[22px] bg-slate-100" />
          </div>
        </div>
      </section>
    );
  }

  if (!availableYears.length || !totalLeads) {
    return (
      <section className={cx("rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-sm sm:rounded-[32px] sm:p-6", className)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[clamp(1.8rem,3vw,2.45rem)] font-black tracking-[-0.05em] text-slate-950">Leads Trends</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">View seasonal lead activity and moving trends across the year.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
            <LineChart className="h-4 w-4" />
            Ready for live lead data
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-sky-700">
            <TrendingUp className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-2xl font-black tracking-[-0.05em] text-slate-950">Nothing to graph yet</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Once leads start landing in the mover dashboard, this panel will turn them into monthly and quarterly demand trends
            so seasonality is obvious instead of hidden in a list.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-4">
            {QUARTERS.map((quarter) => (
              <div key={quarter.id} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: quarter.fill }} />
                  <span className="text-sm font-semibold text-slate-700">{quarter.label}</span>
                </div>
                <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-slate-950">0</p>
                <p className="mt-1 text-xs text-slate-500">{quarter.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cx("rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.3)] sm:rounded-[32px] sm:p-6", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-[clamp(2rem,3vw,2.7rem)] font-black tracking-[-0.06em] text-slate-950">Leads Trends</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">View seasonal lead activity and moving trends across the year.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {availableYears.length > 1 ? (
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              <span>{effectiveYear}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
              <select
                value={effectiveYear}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setSelectedYear(nextYear);
                  setActiveMonthIndex(getDefaultActiveMonthIndex(buildMonthlySeries(leads, nextYear), selectedView));
                }}
                className="absolute opacity-0"
                aria-label="Choose analytics year"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            {VIEW_OPTIONS.map((option) => {
              const isActive = option.id === selectedView;

              return (
                <motion.button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedView(option.id);
                    setActiveMonthIndex(getDefaultActiveMonthIndex(monthlySeries, option.id));
                  }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  className={cx(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition sm:px-5",
                    isActive
                      ? "bg-[linear-gradient(180deg,#355879,#274764)] text-white shadow-[0_10px_24px_-16px_rgba(39,71,100,0.75)]"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {option.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <motion.div
        layout
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-4 shadow-[0_16px_48px_-38px_rgba(15,23,42,0.24)] sm:p-5"
      >
        <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-start">
          <motion.div layout className="border-slate-200 lg:border-r lg:pr-4">
            <p className="text-[0.95rem] font-bold text-slate-800">Total Leads</p>
            <p className="mt-2 text-[clamp(2.15rem,5vw,3.25rem)] font-black leading-none tracking-[-0.07em] text-slate-950">
              {formatNumber(totalLeadDisplay)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", insightTone)}>
                {insight.delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : insight.delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {insight.delta === 100 && insight.label === "Fresh activity" ? "New" : formatDelta(insight.delta)}
              </div>
              <span className="text-xs font-medium text-slate-500">{insight.label}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{insight.detail}</p>
          </motion.div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              {quarterTotals.map((quarter) => (
                <div key={quarter.id} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="h-3.5 w-3.5 rounded-[4px]" style={{ backgroundColor: quarter.fill }} />
                  {quarter.id}
                </div>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-[14px] border border-slate-200 bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="relative min-h-12" style={{ backgroundImage: barGradient }}>
                <div className="absolute inset-0 flex">
                  {quarterTotals.map((quarter) => {
                    const width = totalLeads ? `${(quarter.total / totalLeads) * 100}%` : "0%";

                    return (
                      <button
                        key={quarter.id}
                        type="button"
                        onClick={() => {
                          setSelectedView(quarter.id);
                          setActiveMonthIndex(getDefaultActiveMonthIndex(monthlySeries, quarter.id));
                        }}
                        className="h-full bg-transparent"
                        style={{ width }}
                        aria-label={`${quarter.id}: ${formatNumber(quarter.total)} leads`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {quarterTotals.map((quarter) => {
                const isActive = selectedView === "ALL" || selectedView === quarter.id;

                return (
                  <motion.button
                    key={quarter.id}
                    type="button"
                    onClick={() => {
                      setSelectedView(quarter.id);
                      setActiveMonthIndex(getDefaultActiveMonthIndex(monthlySeries, quarter.id));
                    }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cx(
                      "rounded-[14px] border px-3 py-2.5 text-left shadow-[0_12px_30px_-28px_rgba(15,23,42,0.35)] transition",
                      isActive ? "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]" : "border-slate-200/80 bg-white hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: quarter.fill }} />
                      <span className="text-sm font-semibold text-slate-700">{quarter.id}</span>
                    </div>
                    <p className="mt-2 text-xl font-black leading-none tracking-[-0.04em] text-slate-950">{formatNumber(quarter.total)}</p>
                    <p className="mt-1 text-xs text-slate-500">{quarter.detail}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <motion.div
          layout
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 relative rounded-[22px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-2 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:px-3"
        >
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[290px] w-full sm:h-[360px]" aria-hidden="true">
            <defs>
              <linearGradient id={`${gradientId}-trend`} x1={chartPadding.left} y1="0" x2={chartWidth - chartPadding.right} y2="0" gradientUnits="userSpaceOnUse">
                {lineGradientStops.map((stop, index) => (
                  <stop key={`${stop.offset}-${index}`} offset={stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
              <linearGradient id={`${gradientId}-area`} x1="0" x2="0" y1={chartPadding.top} y2={chartPadding.top + plotHeight} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6aa8cd" stopOpacity="0.18" />
                <stop offset="70%" stopColor="#6aa8cd" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#6aa8cd" stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((value) => {
              const y = chartPadding.top + plotHeight - (value / scaleMax) * plotHeight;
              return (
                <g key={value}>
                  <line x1={chartPadding.left} y1={y} x2={chartWidth - chartPadding.right} y2={y} stroke="#e9eef5" strokeDasharray="4 6" />
                  <text x={chartPadding.left - 12} y={y + 4} textAnchor="end" fontSize="13" fill="#64748b">
                    {value}
                  </text>
                </g>
              );
            })}

            {QUARTERS.map((quarter, index) => {
              const x = chartPadding.left + stepX * quarter.startMonth - (index === 0 ? 0 : stepX / 2);
              const width = stepX * (quarter.endMonth - quarter.startMonth + 1) + (index === 0 || index === QUARTERS.length - 1 ? stepX / 2 : stepX);
              const isMuted = selectedView !== "ALL" && selectedView !== quarter.id;

              return (
                <rect
                  key={quarter.id}
                  x={x}
                  y={chartPadding.top}
                  width={width}
                  height={plotHeight}
                  fill={quarter.fillSoft}
                  opacity={isMuted ? 0.08 : 0.16}
                />
              );
            })}

            {QUARTERS.slice(1).map((quarter) => {
              const x = chartPadding.left + stepX * quarter.startMonth - stepX / 2;
              return <line key={quarter.id} x1={x} y1={chartPadding.top} x2={x} y2={chartPadding.top + plotHeight} stroke="#e3eaf2" />;
            })}

            {points.map((point) => {
              const barHeight = (getGhostBarHeight(point.count, scaleMax, point.monthIndex) / scaleMax) * plotHeight;
              return (
                <g key={`ghost-${point.monthIndex}`} opacity={selectedView === "ALL" || selectedView === point.quarter ? 1 : 0.36}>
                  <rect x={point.x - 6} y={chartPadding.top + plotHeight - barHeight} width="12" height={barHeight} rx="4" fill="#e9eef4" />
                </g>
              );
            })}

            <motion.path
              key={`area-${selectedView}-${effectiveYear}`}
              d={areaPath}
              fill={`url(#${gradientId}-area)`}
              initial={{ opacity: 0 }}
              animate={{ opacity: selectedView === "ALL" ? 1 : 0.85 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
            <motion.path
              key={`line-${selectedView}-${effectiveYear}`}
              d={buildSmoothPath(points)}
              fill="none"
              stroke={`url(#${gradientId}-trend)`}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={selectedView === "ALL" ? 1 : 0.96}
              initial={{ pathLength: 0, opacity: 0.7 }}
              animate={{ pathLength: 1, opacity: selectedView === "ALL" ? 1 : 0.96 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            />

            {activePoint ? (
              <line
                x1={activePoint.x}
                y1={chartPadding.top}
                x2={activePoint.x}
                y2={chartPadding.top + plotHeight}
                stroke={activeQuarter.stroke}
                strokeDasharray="4 6"
                opacity="0.55"
              />
            ) : null}

            {activePoint ? (
              <motion.circle
                key={`glow-${resolvedActiveMonthIndex}-${selectedView}-${effectiveYear}`}
                cx={activePoint.x}
                cy={activePoint.y}
                r={14}
                fill={activeQuarter.stroke}
                opacity={0.14}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.14 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              />
            ) : null}

            {points.map((point) => {
              const quarter = getQuarterConfig(point.quarter);
              const isActive = point.monthIndex === resolvedActiveMonthIndex;
              const isMuted = selectedView !== "ALL" && selectedView !== point.quarter;

              return (
                <motion.circle
                  key={`point-${point.monthIndex}`}
                  cx={point.x}
                  cy={point.y}
                  r={isActive ? 7.5 : 5}
                  fill="#ffffff"
                  stroke={quarter.stroke}
                  strokeWidth={isActive ? 3.5 : 2.5}
                  opacity={isMuted ? 0.4 : 1}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: isMuted ? 0.4 : 1, scale: 1 }}
                  transition={{ duration: 0.24, delay: point.monthIndex * 0.025, ease: "easeOut" }}
                />
              );
            })}

            {monthlySeries.map((month) => {
              const point = points[month.monthIndex];
              return (
                <text key={`month-${month.monthIndex}`} x={point.x} y={chartHeight - 46} textAnchor="middle" fontSize="13" fill="#64748b">
                  {month.shortLabel}
                </text>
              );
            })}

            {QUARTERS.map((quarter) => {
              const startX = chartPadding.left + stepX * quarter.startMonth - (quarter.startMonth === 0 ? 0 : stepX / 2);
              const width = stepX * (quarter.endMonth - quarter.startMonth + 1) + (quarter.startMonth === 0 || quarter.endMonth === 11 ? stepX / 2 : stepX);
              const isMuted = selectedView !== "ALL" && selectedView !== quarter.id;

              return (
                <g key={`band-${quarter.id}`} opacity={isMuted ? 0.45 : 1}>
                  <rect x={startX} y={chartHeight - 28} width={width} height="18" rx="4" fill="#eef3f8" />
                  <text x={startX + width / 2} y={chartHeight - 15} textAnchor="middle" fontSize="13" fontWeight="700" fill="#94a3b8">
                    {quarter.id}
                  </text>
                </g>
              );
            })}
          </svg>

          <AnimatePresence mode="wait">
            {activePoint ? (
              <motion.div
                key={`${resolvedActiveMonthIndex}-${selectedView}-${effectiveYear}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={cx(
                  "pointer-events-none absolute top-6 rounded-[12px] border border-slate-700/60 bg-slate-800/95 px-4 py-3 text-white shadow-[0_20px_44px_-28px_rgba(15,23,42,0.82)] backdrop-blur",
                  tooltipAlignment === "left" ? "translate-x-0" : tooltipAlignment === "right" ? "-translate-x-full" : "-translate-x-1/2",
                )}
                style={{
                  left: `${(activePoint.x / chartWidth) * 100}%`,
                }}
              >
                <p className="text-[0.92rem] font-medium text-slate-100">{activeMonth?.label}</p>
                <p className="mt-1 text-[1.02rem] font-black">
                  Leads: <span className="font-black">{formatNumber(activeMonth?.count ?? 0)}</span>
                </p>
                <span
                  className={cx(
                    "absolute top-full h-3 w-3 -translate-y-1/2 rotate-45 border-r border-b border-slate-700/60 bg-slate-800/95",
                    tooltipAlignment === "left" ? "left-6" : tooltipAlignment === "right" ? "right-6" : "left-1/2 -translate-x-1/2",
                  )}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            className="absolute grid grid-cols-12"
            style={{
              left: `${(chartPadding.left / chartWidth) * 100}%`,
              top: `${(chartPadding.top / chartHeight) * 100}%`,
              width: `${(plotWidth / chartWidth) * 100}%`,
              height: `${(plotHeight / chartHeight) * 100}%`,
            }}
          >
            {monthlySeries.map((month) => (
              <button
                key={month.monthIndex}
                type="button"
                onMouseEnter={() => setActiveMonthIndex(month.monthIndex)}
                onFocus={() => setActiveMonthIndex(month.monthIndex)}
                onClick={() => setActiveMonthIndex(month.monthIndex)}
                className="h-full w-full bg-transparent"
                aria-label={`${month.label} ${effectiveYear}: ${month.count} leads`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
