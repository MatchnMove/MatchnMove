export const NZ_SERVICE_AREAS = [
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Gisborne",
  "Hawke's Bay",
  "Taranaki",
  "Manawatu-Whanganui",
  "Wellington",
  "Tasman",
  "Nelson",
  "Marlborough",
  "West Coast",
  "Canterbury",
  "Otago",
  "Southland",
] as const;

export type NzServiceArea = (typeof NZ_SERVICE_AREAS)[number];

export const NZ_SERVICE_AREA_GROUPS = [
  {
    id: "north",
    label: "North Island",
    regions: [
      "Northland",
      "Auckland",
      "Waikato",
      "Bay of Plenty",
      "Gisborne",
      "Hawke's Bay",
      "Taranaki",
      "Manawatu-Whanganui",
      "Wellington",
    ] as NzServiceArea[],
  },
  {
    id: "south",
    label: "South Island",
    regions: ["Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"] as NzServiceArea[],
  },
] as const;

const serviceAreaLookup = new Map(
  NZ_SERVICE_AREAS.map((area) => [area.toLowerCase(), area] as const),
);

export function canonicaliseServiceArea(value: string): NzServiceArea | null {
  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase();
  return serviceAreaLookup.get(normalized) ?? null;
}

export function isNzServiceArea(value: string): value is NzServiceArea {
  return canonicaliseServiceArea(value) !== null;
}

export function sanitiseNzServiceAreas(serviceAreas: string[]) {
  const seen = new Set<NzServiceArea>();
  const normalized: NzServiceArea[] = [];

  for (const area of serviceAreas) {
    const canonical = canonicaliseServiceArea(area);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    normalized.push(canonical);
  }

  return normalized;
}

export function formatServiceAreaLabel(value: string) {
  const canonical = canonicaliseServiceArea(value);
  if (canonical) return canonical;

  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join(" ");
}

export function dedupeServiceAreaLabels(serviceAreas: string[]) {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const area of serviceAreas) {
    const label = formatServiceAreaLabel(area);
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    labels.push(label);
  }

  return labels;
}
