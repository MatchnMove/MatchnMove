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

export const NZ_SERVICE_AREA_LOCALITIES = {
  Northland: ["Whangarei", "Kerikeri", "Bay of Islands", "Kaitaia", "Kaikohe", "Dargaville"],
  Auckland: ["Auckland City", "North Shore", "West Auckland", "South Auckland", "East Auckland", "Manukau", "Waitakere", "Hibiscus Coast", "Warkworth"],
  Waikato: ["Hamilton", "Cambridge", "Te Awamutu", "Taupo", "Tokoroa", "Matamata", "Morrinsville", "Thames-Coromandel", "Coromandel"],
  "Bay of Plenty": ["Tauranga", "Mount Maunganui", "Papamoa", "Rotorua", "Whakatane", "Opotiki", "Katikati"],
  Gisborne: ["Gisborne", "Wairoa", "East Coast", "Tolaga Bay"],
  "Hawke's Bay": ["Napier", "Hastings", "Havelock North", "Waipukurau", "Central Hawke's Bay"],
  Taranaki: ["New Plymouth", "Stratford", "Hawera", "Waitara", "South Taranaki"],
  "Manawatu-Whanganui": ["Palmerston North", "Whanganui", "Levin", "Feilding", "Dannevirke", "Taihape", "Horowhenua"],
  Wellington: ["Wellington City", "Lower Hutt", "Upper Hutt", "Porirua", "Kapiti Coast", "Masterton", "Wairarapa"],
  Tasman: ["Richmond", "Motueka", "Takaka", "Golden Bay", "Murchison"],
  Nelson: ["Nelson City", "Stoke", "Tahunanui", "Atawhai"],
  Marlborough: ["Blenheim", "Picton", "Marlborough Sounds", "Renwick", "Seddon"],
  "West Coast": ["Greymouth", "Westport", "Hokitika", "Reefton", "Franz Josef", "Fox Glacier"],
  Canterbury: ["Christchurch", "Rangiora", "Kaiapoi", "Ashburton", "Timaru", "Waimate", "Geraldine", "Mackenzie", "Kaikoura"],
  Otago: ["Dunedin", "Queenstown", "Wanaka", "Alexandra", "Cromwell", "Oamaru", "Balclutha", "Mosgiel", "Central Otago", "Clutha", "Waitaki"],
  Southland: ["Invercargill", "Gore", "Te Anau", "Winton", "Riverton", "Fiordland"],
} as const satisfies Record<NzServiceArea, readonly string[]>;

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
  NZ_SERVICE_AREAS.flatMap((area) => [
    [normaliseServiceAreaKey(area), area] as const,
    [normaliseServiceAreaKey(`${area} Region`), area] as const,
  ]),
);

const localityServiceAreaLookup = new Map(
  NZ_SERVICE_AREAS.flatMap((area) =>
    NZ_SERVICE_AREA_LOCALITIES[area].map((locality) => [normaliseServiceAreaKey(locality), area] as const),
  ),
);

function normaliseServiceAreaKey(value: string) {
  return value
    .trim()
    .replace(/['\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function canonicaliseServiceArea(value: string): NzServiceArea | null {
  const normalized = normaliseServiceAreaKey(value);
  return serviceAreaLookup.get(normalized) ?? null;
}

export function matchNzServiceArea(value: string | null | undefined): NzServiceArea | null {
  if (!value) return null;

  const normalized = normaliseServiceAreaKey(value);
  return serviceAreaLookup.get(normalized) ?? localityServiceAreaLookup.get(normalized) ?? null;
}

export function getQuoteServiceAreas(quote: { fromCity?: string | null; fromRegion?: string | null; toCity?: string | null; toRegion?: string | null }) {
  return Array.from(
    new Set(
      [quote.fromRegion, quote.fromCity, quote.toRegion, quote.toCity]
        .map((value) => matchNzServiceArea(value))
        .filter((area): area is NzServiceArea => Boolean(area)),
    ),
  );
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
