export const CLEANING_LEAD_PRICING = {
  fixedPrice: 1500,
  currency: "NZD",
} as const;

export const CLEANING_LEAD_PRICE = CLEANING_LEAD_PRICING.fixedPrice;

export function formatCleaningLeadPrice(locale = "en-NZ") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: CLEANING_LEAD_PRICING.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(CLEANING_LEAD_PRICING.fixedPrice / 100);
}
