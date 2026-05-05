const NORTH_ISLAND_REGIONS = new Set([
  "northland",
  "auckland",
  "waikato",
  "bay of plenty",
  "gisborne",
  "hawke's bay",
  "hawkes bay",
  "taranaki",
  "manawatu-whanganui",
  "manawatu whanganui",
  "manawatū-whanganui",
  "manawatū whanganui",
  "wellington",
]);

const SOUTH_ISLAND_REGIONS = new Set([
  "tasman",
  "nelson",
  "marlborough",
  "west coast",
  "canterbury",
  "otago",
  "southland",
]);

export const LEAD_PRICING = {
  basePrice: 2000,
  largeHomeModifier: 1000,
  urgentModifier: 2000,
  sameIslandLongHaulModifier: 2000,
  interIslandModifier: 4500,
} as const;

type LeadPricingInput = {
  bedrooms?: string | null;
  moveDate?: Date | null;
  dateFlexible?: boolean;
  fromCity?: string | null;
  fromRegion?: string | null;
  fromCountry?: string | null;
  toCity?: string | null;
  toRegion?: string | null;
  toCountry?: string | null;
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getIsland(region?: string | null) {
  const normalized = normalize(region);
  if (NORTH_ISLAND_REGIONS.has(normalized)) return "north";
  if (SOUTH_ISLAND_REGIONS.has(normalized)) return "south";
  return null;
}

function isLargeHome(bedrooms?: string | null) {
  const numericBedrooms = Number.parseInt(bedrooms ?? "", 10);
  return !Number.isNaN(numericBedrooms) && numericBedrooms >= 4;
}

function isUrgentMove(moveDate?: Date | null, dateFlexible?: boolean) {
  if (!moveDate || dateFlexible) return false;

  const moveTime = moveDate.getTime();
  if (Number.isNaN(moveTime)) return false;

  const now = Date.now();
  const diffDays = (moveTime - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

function getRouteFactor(input: LeadPricingInput) {
  const fromIsland = getIsland(input.fromRegion);
  const toIsland = getIsland(input.toRegion);

  if (fromIsland && toIsland && fromIsland !== toIsland) {
    return {
      label: "Between islands",
      amount: LEAD_PRICING.interIslandModifier,
    };
  }

  const fromCountry = normalize(input.fromCountry);
  const toCountry = normalize(input.toCountry);
  const fromCity = normalize(input.fromCity);
  const toCity = normalize(input.toCity);
  const fromRegion = normalize(input.fromRegion);
  const toRegion = normalize(input.toRegion);

  const isSameLocation =
    fromCountry === toCountry &&
    fromRegion === toRegion &&
    fromCity === toCity;

  if (!isSameLocation && (fromIsland || toIsland || fromCountry === toCountry)) {
    return {
      label: "Across island",
      amount: LEAD_PRICING.sameIslandLongHaulModifier,
    };
  }

  return null;
}

export function calculateLeadPrice(input: LeadPricingInput) {
  const modifiers: Array<{ label: string; amount: number }> = [];

  if (isLargeHome(input.bedrooms)) {
    modifiers.push({ label: "Large home", amount: LEAD_PRICING.largeHomeModifier });
  }

  if (isUrgentMove(input.moveDate, input.dateFlexible)) {
    modifiers.push({ label: "Urgent move", amount: LEAD_PRICING.urgentModifier });
  }

  const routeFactor = getRouteFactor(input);
  if (routeFactor) {
    modifiers.push(routeFactor);
  }

  return {
    price: LEAD_PRICING.basePrice + modifiers.reduce((sum, modifier) => sum + modifier.amount, 0),
    modifiers,
  };
}
