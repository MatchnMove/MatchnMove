export const CHECKLIST_TASKS = [
  {
    id: "quotes",
    days: -28,
    group: "Four weeks before",
    text: "Request moving quotes",
    href: "/quote",
  },
  {
    id: "inventory",
    days: -28,
    group: "Four weeks before",
    text: "Make a room-by-room inventory",
    href: "/moving-inventory",
  },
  {
    id: "mover",
    days: -14,
    group: "Two weeks before",
    text: "Confirm your chosen mover, scope and booking terms",
  },
  {
    id: "materials",
    days: -14,
    group: "Two weeks before",
    text: "Organise boxes and packing materials",
  },
  {
    id: "utilities",
    days: -14,
    group: "Two weeks before",
    text: "Arrange power, internet and other utilities",
  },
  {
    id: "address",
    days: -14,
    group: "Two weeks before",
    text: "Notify relevant organisations of your address change",
  },
  {
    id: "cleaning",
    days: -7,
    group: "One week before",
    text: "Confirm cleaning and property handover timing",
    href: "/cleaning-quotes",
  },
  {
    id: "keys",
    days: -7,
    group: "One week before",
    text: "Confirm keys, parking and property access",
  },
  {
    id: "essentials",
    days: -7,
    group: "One week before",
    text: "Pack an essentials bag, medicines and documents",
  },
  {
    id: "fridge",
    days: -1,
    group: "One week before",
    text: "Prepare appliances as recommended by the manufacturer",
  },
  {
    id: "checks",
    days: 0,
    group: "Moving day",
    text: "Complete final room, meter and key checks",
  },
  {
    id: "inspect",
    days: 0,
    group: "Moving day",
    text: "Check items with the mover and keep booking paperwork",
  },
  {
    id: "unpack",
    days: 1,
    group: "After the move",
    text: "Unpack essentials and check your inventory",
  },
  {
    id: "follow-up",
    days: 3,
    group: "After the move",
    text: "Follow up any issues directly with your provider",
  },
] as const;
export type ChecklistState = {
  version: 1;
  date: string;
  done: string[];
  expiresAt: number;
};
export function checklistDate(date: string, offset: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(date + "T12:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date)
    return null;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function parseChecklist(
  raw: string | null,
  now = Date.now(),
): ChecklistState | null {
  try {
    if (!raw || raw.length > 3000) return null;
    const v = JSON.parse(raw);
    if (
      v.version !== 1 ||
      typeof v.expiresAt !== "number" ||
      v.expiresAt <= now ||
      v.expiresAt > now + 91 * 86400000 ||
      typeof v.date !== "string" ||
      (v.date && !checklistDate(v.date, 0)) ||
      !Array.isArray(v.done) ||
      v.done.length > CHECKLIST_TASKS.length ||
      !v.done.every(
        (id: unknown) =>
          typeof id === "string" && CHECKLIST_TASKS.some((t) => t.id === id),
      )
    )
      return null;
    return {
      version: 1,
      date: v.date,
      done: [...new Set<string>(v.done)],
      expiresAt: v.expiresAt,
    };
  } catch {
    return null;
  }
}
