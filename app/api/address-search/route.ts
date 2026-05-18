import { NextResponse } from "next/server";
import { parseNominatimAddress } from "@/lib/address-search";
import type { NominatimResult } from "@/lib/address-search";

const SEARCH_TIMEOUT_MS = 6000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
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

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
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

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Address search is temporarily unavailable.", suggestions: [] }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
