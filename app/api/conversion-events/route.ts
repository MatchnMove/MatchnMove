import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { CONVERSION_NAMES, CONVERSION_SOURCES } from "@/lib/conversion-policy";
import { hasSameOrigin } from "@/lib/request-origin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return new NextResponse(null, { status: 403 });
  if (!rateLimit("conversion:" + getClientIp(req), 60).allowed)
    return new NextResponse(null, { status: 429 });
  const raw = await req.text();
  if (raw.length > 512) return new NextResponse(null, { status: 413 });
  let result;
  try {
    result = z
      .object({
        id: z.string().uuid(),
        name: z.enum(CONVERSION_NAMES),
        source: z.enum(CONVERSION_SOURCES).optional(),
        step: z.number().int().min(1).max(3).optional(),
      })
      .strict()
      .safeParse(JSON.parse(raw));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!result.success) return new NextResponse(null, { status: 400 });
  try {
    await prisma.conversionEvent.createMany({
      data: [result.data],
      skipDuplicates: true,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
