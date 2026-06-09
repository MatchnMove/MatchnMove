import { NextRequest, NextResponse } from "next/server";
import { getGooglePlaceAddress } from "@/lib/google-places";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  if (!rateLimit(`address-details:${getClientIp(request)}`, 20).allowed) {
    return NextResponse.json({ error: "Too many address lookups." }, { status: 429 });
  }

  const placeId = request.nextUrl.searchParams.get("placeId")?.trim() ?? "";
  const sessionToken = request.nextUrl.searchParams.get("sessionToken")?.trim() || undefined;

  if (!placeId || placeId.length > 300) {
    return NextResponse.json({ error: "Invalid place ID." }, { status: 400 });
  }

  try {
    const suggestion = await getGooglePlaceAddress(placeId, sessionToken);
    return NextResponse.json({ attribution: "Google Maps", suggestion });
  } catch {
    return NextResponse.json({ error: "Address details are temporarily unavailable." }, { status: 502 });
  }
}
