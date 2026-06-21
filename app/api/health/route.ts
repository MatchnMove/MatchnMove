import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        checks: { database: "ok" },
        responseTimeMs: Math.round(performance.now() - startedAt),
      },
      { status: 200, headers: responseHeaders },
    );
  } catch (error) {
    console.error("health check failed", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        checks: { database: "unavailable" },
        responseTimeMs: Math.round(performance.now() - startedAt),
      },
      { status: 503, headers: responseHeaders },
    );
  }
}
