function aucklandParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}
export function aucklandMidnight(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
    throw new Error("Choose valid report dates.");
  const desired = new Date(`${day}T00:00:00.000Z`).getTime();
  if (
    !Number.isFinite(desired) ||
    new Date(desired).toISOString().slice(0, 10) !== day
  )
    throw new Error("Choose valid report dates.");
  let instant = desired;
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = aucklandParts(new Date(instant));
    const represented = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second,
    );
    instant += desired - represented;
  }
  return new Date(instant);
}
function addDays(day: string, days: number) {
  const instant = new Date(`${day}T00:00:00.000Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}
export function recruitmentDateRange(
  period: string,
  from = "",
  to = "",
  now = new Date(),
): Record<string, string> {
  if (period === "all") return {};
  const p = aucklandParts(now);
  const today = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const startDay =
    period === "custom" ? from : addDays(today, 1 - Number(period));
  const endDay = period === "custom" ? to : today;
  const start = aucklandMidnight(startDay);
  const end = new Date(aucklandMidnight(addDays(endDay, 1)).getTime() - 1);
  if (start > end) throw new Error("The report start must be before its end.");
  return { start: start.toISOString(), end: end.toISOString() };
}
