import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateMoverProfileReadiness, requireAuthenticatedMover } from "@/lib/mover-profile";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";
import { moverLogoSchema, parseDataUrl } from "@/lib/validators";

const ALLOWED_LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = moverLogoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid logo" }, { status: 400 });
  }

  const logoData = parseDataUrl(parsed.data.logoUrl);
  if (!logoData) {
    return NextResponse.json({ error: "Upload a PNG, JPG, WEBP, or SVG image." }, { status: 400 });
  }

  if (!ALLOWED_LOGO_MIME_TYPES.has(logoData.mimeType)) {
    return NextResponse.json({ error: "That logo format is not allowed." }, { status: 400 });
  }

  if (logoData.fileSize > MAX_LOGO_FILE_SIZE) {
    return NextResponse.json({ error: "Please keep the logo under 2MB." }, { status: 400 });
  }

  const updatedMover = await prisma.moverCompany.update({
    where: { id: mover.id },
    data: { logoUrl: parsed.data.logoUrl },
    include: {
      user: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  revalidatePublicMovers();
  revalidateAboutPage();

  return NextResponse.json({
    ok: true,
    logoUrl: updatedMover.logoUrl,
    readiness: calculateMoverProfileReadiness(updatedMover),
  });
}
