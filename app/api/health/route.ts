import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        database: "up",
        timestamp: now
      },
      { status: 200 }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      {
        status: "degraded",
        database: "down",
        timestamp: now,
        ...(process.env.NODE_ENV !== "production" ? { detail } : {})
      },
      { status: 503 }
    );
  }
}
