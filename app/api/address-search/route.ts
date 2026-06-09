import { NextRequest, NextResponse } from "next/server";
import { parseNominatimAddress } from "@/lib/address-search";
import type { NominatimResult } from "@/lib/address-search";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const SEARCH_TIMEOUT_MS = 6000;
const PUBLIC_NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

function getAddressSearchUrl() {
  const configuredUrl = process.env.ADDRESS_SEARCH_BASE_URL?.trim();
  if (configuredUrl) return configuredUrl;
  return process.env.NODE_ENV === "production" ? null : PUBLIC_NOMINATIM_SEARCH_URL;
}

export async function GET(request: NextRequest) {
  if (!rateLimit(`address-search:${getClientIp(request)}`, 30).allowed) {
    return NextResponse.json({ error: "Too many address searches.", suggestions: [] }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ available: true, suggestions: [] });
  }

  const addressSearchUrl = getAddressSearchUrl();
  if (!addressSearchUrl) {
    return NextResponse.json(
      {
        available: false,
        error: "Address suggestions are temporarily unavailable. Enter the address manually.",
        suggestions: [],
      },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      countrycodes: "nz",
      limit: "5",
      q: query
    });

    const response = await fetch(`${addressSearchUrl}?${params.toString()}`, {
      cache: "no-store",
      headers: {
        "Accept-Language": "en-NZ",
        "User-Agent": "MatchnMove/1.0 address search"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Address search is temporarily unavailable.", suggestions: [] }, { status: 502 });
    }

    const data: unknown = await response.json();
    const suggestions = Array.isArray(data)
      ? data.map((item: NominatimResult) => parseNominatimAddress(item)).filter((item) => item.label)
      : [];

    return NextResponse.json({ available: true, suggestions });
  } catch {
    return NextResponse.json({ error: "Address search is temporarily unavailable.", suggestions: [] }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
