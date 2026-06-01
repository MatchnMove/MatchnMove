import { NextResponse } from "next/server";
import { getPublicMovers } from "@/lib/public-movers";
import { buildHeroMoverItems } from "@/src/components/hero/hero-mover-data";

export async function GET() {
  const movers = await getPublicMovers();

  return NextResponse.json({
    movers: buildHeroMoverItems(movers),
    source: movers.length > 0 ? "database" : "fallback",
  });
}
