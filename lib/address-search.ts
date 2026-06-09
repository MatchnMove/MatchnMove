export type AddressSuggestion = {
  label: string;
  street: string;
  suburb: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  placeId?: string;
  provider?: "google" | "openstreetmap";
};

export type NominatimAddress = {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
};

export type NominatimResult = {
  display_name?: string;
  address?: NominatimAddress;
};

export const parseNominatimAddress = (x: NominatimResult): AddressSuggestion => {
  const addr = x.address ?? {};
  const streetParts = [addr.house_number, addr.road].filter((part): part is string => Boolean(part));

  return {
    label: x.display_name ?? "",
    street: streetParts.join(" ").trim(),
    suburb: addr.suburb || addr.neighbourhood || "",
    city: addr.city || addr.town || addr.village || addr.county || "",
    region: addr.state || addr.region || "",
    postcode: addr.postcode || "",
    country: addr.country || "New Zealand"
  };
};

export function addressSuggestionToValue(suggestion: AddressSuggestion) {
  return suggestion.street || suggestion.label;
}
