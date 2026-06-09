import { NextRequest, NextResponse } from "next/server";
import { parseNominatimAddress } from "@/lib/address-search";
import type { NominatimResult } from "@/lib/address-search";
import { autocompleteGooglePlaces, isGooglePlacesConfigured } from "@/lib/google-places";
import { requestNominatim } from "@/lib/nominatim";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const mode = searchParams.get("mode") === "autocomplete" ? "autocomplete" : "manual";
  const sessionToken = searchParams.get("sessionToken")?.trim() || undefined;
  const limit = mode === "autocomplete" ? 60 : 10;

  if (!rateLimit(`address-search:${mode}:${getClientIp(request)}`, limit).allowed) {
    return NextResponse.json({ error: "Too many address searches.", suggestions: [] }, { status: 429 });
  }

  if (query.length < 3) {
    return NextResponse.json({ available: true, suggestions: [] });
  }

  if (mode === "autocomplete") {
    if (!isGooglePlacesConfigured()) {
      return NextResponse.json(
        { available: false, autocomplete: false, suggestions: [] },
        { status: 503 },
      );
    }

    try {
      const suggestions = await autocompleteGooglePlaces(query, sessionToken);
      return NextResponse.json({
        available: true,
        autocomplete: true,
        provider: "google",
        attribution: "Google Maps",
        suggestions,
      });
    } catch {
      return NextResponse.json(
        { available: false, autocomplete: false, suggestions: [] },
        { status: 503 },
      );
    }
  }

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      countrycodes: "nz",
      limit: "5",
      q: query
    });

    const data = await requestNominatim("/search", params);
    const suggestions = Array.isArray(data)
      ? data
          .map((item: NominatimResult) => ({
            ...parseNominatimAddress(item),
            provider: "openstreetmap" as const,
          }))
          .filter((item) => item.label)
      : [];

    return NextResponse.json({
      available: true,
      attribution: "OpenStreetMap contributors",
      suggestions,
    });
  } catch {
    return NextResponse.json({ error: "Address search is temporarily unavailable.", suggestions: [] }, { status: 502 });
  }
}
