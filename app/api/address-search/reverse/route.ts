import { NextRequest, NextResponse } from "next/server";
import { parseNominatimAddress } from "@/lib/address-search";
import type { NominatimResult } from "@/lib/address-search";
import { requestNominatim } from "@/lib/nominatim";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  if (!rateLimit(`address-reverse:${getClientIp(request)}`, 5).allowed) {
    return NextResponse.json({ error: "Too many location lookups." }, { status: 429 });
  }

  const latitude = request.nextUrl.searchParams.get("lat")?.trim() ?? "";
  const longitude = request.nextUrl.searchParams.get("lon")?.trim() ?? "";
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      zoom: "18",
      lat: String(lat),
      lon: String(lon),
    });
    const data = (await requestNominatim("/reverse", params)) as NominatimResult;
    const suggestion = parseNominatimAddress(data);

    if (!suggestion.label) {
      return NextResponse.json({ error: "No address was found for this location." }, { status: 404 });
    }

    return NextResponse.json({
      attribution: "OpenStreetMap contributors",
      suggestion,
    });
  } catch {
    return NextResponse.json({ error: "Location lookup is temporarily unavailable." }, { status: 502 });
  }
}
