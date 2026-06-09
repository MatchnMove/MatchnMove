import { NextRequest, NextResponse } from "next/server";
import { parseNominatimAddress } from "@/lib/address-search";
import type { NominatimResult } from "@/lib/address-search";
import { requestNominatim } from "@/lib/nominatim";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  if (!rateLimit(`address-search:${getClientIp(request)}`, 10).allowed) {
    return NextResponse.json({ error: "Too many address searches.", suggestions: [] }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ available: true, suggestions: [] });
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
      ? data.map((item: NominatimResult) => parseNominatimAddress(item)).filter((item) => item.label)
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
