import "server-only";

import { GoogleAuth } from "google-auth-library";
import type { AddressSuggestion } from "@/lib/address-search";

const PLACES_BASE_URL = "https://places.googleapis.com/v1";
const REQUEST_TIMEOUT_MS = 6_000;

type GoogleAddressComponent = {
  longText?: string;
  types?: string[];
};

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
    };
  }>;
};

type GooglePlaceDetails = {
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
};

function getConfig() {
  const clientEmail = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const inferredProjectId = clientEmail?.match(/@([^.]+)\.iam\.gserviceaccount\.com$/)?.[1];
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID?.trim() || inferredProjectId;

  if (!clientEmail || !privateKey || !projectId) return null;
  return { clientEmail, privateKey, projectId };
}

async function authorizationHeaders() {
  const config = getConfig();
  if (!config) throw new Error("Google Places is not configured.");

  const auth = new GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
      project_id: config.projectId,
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  if (!accessToken.token) throw new Error("Could not authenticate with Google Places.");

  return {
    Authorization: `Bearer ${accessToken.token}`,
    "X-Goog-User-Project": config.projectId,
  };
}

async function requestGooglePlaces(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        ...(await authorizationHeaders()),
        ...init.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google Places returned ${response.status}: ${body.slice(0, 300)}`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

export function isGooglePlacesConfigured() {
  return Boolean(getConfig());
}

export async function autocompleteGooglePlaces(input: string, sessionToken?: string) {
  const data = (await requestGooglePlaces(`${PLACES_BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["nz"],
      languageCode: "en-NZ",
      sessionToken: sessionToken || undefined,
    }),
  })) as GoogleAutocompleteResponse;

  return (data.suggestions ?? [])
    .map(({ placePrediction }) => ({
      label: placePrediction?.text?.text?.trim() ?? "",
      street: "",
      suburb: "",
      city: "",
      region: "",
      postcode: "",
      country: "New Zealand",
      placeId: placePrediction?.placeId,
      provider: "google" as const,
    }))
    .filter((suggestion) => suggestion.label && suggestion.placeId)
    .slice(0, 5);
}

function componentValue(components: GoogleAddressComponent[], ...types: string[]) {
  const component = components.find((item) => item.types?.some((type) => types.includes(type)));
  return component?.longText?.trim() ?? "";
}

export async function getGooglePlaceAddress(
  placeId: string,
  sessionToken?: string,
): Promise<AddressSuggestion> {
  const params = new URLSearchParams({ languageCode: "en-NZ" });
  if (sessionToken) params.set("sessionToken", sessionToken);

  const data = (await requestGooglePlaces(
    `${PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}?${params.toString()}`,
    {
      method: "GET",
      headers: { "X-Goog-FieldMask": "formattedAddress,addressComponents" },
    },
  )) as GooglePlaceDetails;

  const components = data.addressComponents ?? [];
  const streetNumber = componentValue(components, "street_number");
  const route = componentValue(components, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ");

  return {
    label: data.formattedAddress?.trim() ?? street,
    street,
    suburb: componentValue(components, "sublocality_level_1", "sublocality", "neighborhood"),
    city: componentValue(components, "locality", "postal_town", "administrative_area_level_2"),
    region: componentValue(components, "administrative_area_level_1"),
    postcode: componentValue(components, "postal_code"),
    country: componentValue(components, "country") || "New Zealand",
    placeId,
    provider: "google",
  };
}
