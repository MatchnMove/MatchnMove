import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { inventorySchema } from "@/lib/inventory";
import { encryptDraft, decryptDraft } from "@/lib/draft-privacy";
import {
  newPrivateToken,
  tokenHash,
  privateCookieOptions,
} from "@/lib/customer-access";
import { hasSameOrigin } from "@/lib/request-origin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
const COOKIE = "mm_quote_draft";
const schema = z
  .object({
    form: z
      .object(
        Object.fromEntries(
          [
            "name",
            "email",
            "phone",
            "fromPropertyType",
            "toPropertyType",
            "bedrooms",
            "fromAddress",
            "fromCity",
            "fromRegion",
            "fromPostcode",
            "fromCountry",
            "toAddress",
            "toCity",
            "toRegion",
            "toPostcode",
            "toCountry",
            "moveDate",
            "movingWhat",
          ].map((key) => [
            key,
            z
              .string()
              .max(key === "movingWhat" ? 2000 : 254)
              .optional(),
          ]),
        ),
      )
      .extend({ dateFlexible: z.boolean().optional() })
      .optional(),
    extra: z
      .object({
        fromFloor: z.string().max(30).optional(),
        fromHasLift: z.enum(["yes", "no", ""]).optional(),
        fromStorageSize: z.string().max(60).optional(),
        toKnownPropertyType: z.enum(["yes", "no", ""]).optional(),
        toBedrooms: z.string().max(20).optional(),
        toFloor: z.string().max(30).optional(),
        toHasLift: z.enum(["yes", "no", ""]).optional(),
        toStorageSize: z.string().max(60).optional(),
      })
      .optional(),
    inventory: inventorySchema.optional(),
    cleaningSelected: z.boolean().optional(),
    cleaningNotes: z.string().max(2000).optional(),
    cleaning: z
      .object({
        location: z.enum(["MOVE_OUT", "MOVE_IN"]).optional(),
        services: z.array(z.string().max(40)).max(9).optional(),
        preferredDate: z.string().max(10).optional(),
        timeWindow: z.string().max(20).optional(),
        propertyEmpty: z.string().max(10).optional(),
        moverTiming: z.string().max(10).optional(),
        accessNotes: z.string().max(1000).optional(),
        carpetRooms: z.number().int().min(1).max(50).optional(),
      })
      .optional(),
    calculator: z
      .object({
        routeType: z.enum([
          "local",
          "regional",
          "long-distance",
          "inter-island",
        ]),
        homeSize: z.enum(["small", "one", "two", "three", "four"]),
        city: z.enum(["auckland", "wellington", "christchurch", "other"]),
        packing: z.boolean(),
        difficultAccess: z.boolean(),
        heavyItem: z.boolean(),
        busyTiming: z.boolean(),
      })
      .optional(),
    step: z.number().int().min(1).max(3).optional(),
  })
  .strict();
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return NextResponse.json({ draft: null }, { headers });
  const row = await prisma.quoteDraft.findUnique({
    where: { tokenHash: tokenHash(token) },
  });
  if (!row || row.expiresAt < new Date()) {
    if (row) await prisma.quoteDraft.delete({ where: { id: row.id } });
    return NextResponse.json({ draft: null }, { headers });
  }
  try {
    return NextResponse.json(
      { draft: decryptDraft(row.encryptedData), expiresAt: row.expiresAt },
      { headers },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Saved progress could not be opened. Clear it and start again.",
      },
      { status: 409, headers },
    );
  }
}
export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!rateLimit("draft:" + getClientIp(req), 30).allowed)
    return NextResponse.json(
      { error: "Please wait before saving again." },
      { status: 429 },
    );
  const raw = await req.text();
  if (raw.length > 40000)
    return NextResponse.json({ error: "Draft is too large" }, { status: 413 });
  let input;
  try {
    input = schema.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid draft" }, { status: 400 });
  }
  if (!input.success)
    return NextResponse.json(
      { error: "Check your saved details." },
      { status: 400 },
    );
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value || newPrivateToken();
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await prisma.quoteDraft.upsert({
    where: { tokenHash: tokenHash(token) },
    create: {
      tokenHash: tokenHash(token),
      encryptedData: encryptDraft(input.data),
      expiresAt,
    },
    update: { encryptedData: encryptDraft(input.data), expiresAt },
  });
  jar.set(COOKIE, token, { ...privateCookieOptions, maxAge: 7 * 86400 });
  await prisma.quoteDraft.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return NextResponse.json({ saved: true, expiresAt }, { headers });
}
export async function DELETE(req: NextRequest) {
  if (!hasSameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token)
    await prisma.quoteDraft.deleteMany({
      where: { tokenHash: tokenHash(token) },
    });
  jar.delete(COOKIE);
  return NextResponse.json({ cleared: true }, { headers });
}
