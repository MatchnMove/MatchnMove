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

/** Photon returns OSM address components, including partial street/locality matches. */
export function parsePhotonAddress(properties: Record<string, unknown>): AddressSuggestion | null {
  const text = (key: string) => typeof properties[key] === "string" ? properties[key].trim() : "";
  if (text("countrycode").toUpperCase() !== "NZ") return null;
  const name = text("name");
  const road = text("street") || (text("type") === "street" ? name : "");
  const street = [road ? text("housenumber") : "", road].filter(Boolean).join(" ");
  const suburb = text("district") || text("locality");
  const city = (text("type") === "city" ? name : "") || text("city") || text("county");
  const region = text("state") || (text("type") === "state" ? name : "");
  const postcode = text("postcode");
  const parts = [name, street, suburb, city, region, postcode].filter(Boolean);
  if (!parts.length) return null;
  return {
    label: [...new Set([...parts, "New Zealand"])].join(", "),
    street, suburb, city, region, postcode,
    country: "New Zealand",
    provider: "openstreetmap",
  };
}
