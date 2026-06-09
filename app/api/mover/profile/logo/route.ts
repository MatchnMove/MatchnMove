import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { detectDocumentMimeType, getDocumentSha256 } from "@/lib/document-security";
import { calculateMoverProfileReadiness, requireAuthenticatedMover } from "@/lib/mover-profile";
import { getStoredMoverLogoKey, toStoredMoverLogoUrl } from "@/lib/mover-logo";
import { deletePrivateDocument, isPrivateStorageConfigured, putPrivateDocument } from "@/lib/private-storage";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";
import { moverLogoSchema, parseDataUrl } from "@/lib/validators";

const ALLOWED_LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_LOGO_FILE_SIZE = 256 * 1024;
function getLogoExtension(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function POST(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = moverLogoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid logo" }, { status: 400 });
  }

  const logoData = parseDataUrl(parsed.data.logoUrl);
  if (!logoData) {
    return NextResponse.json({ error: "Upload a PNG, JPG, or WEBP image." }, { status: 400 });
  }

  const buffer = Buffer.from(logoData.base64, "base64");
  const detectedMimeType = detectDocumentMimeType(buffer);
  if (!detectedMimeType || detectedMimeType !== logoData.mimeType || !ALLOWED_LOGO_MIME_TYPES.has(detectedMimeType)) {
    return NextResponse.json({ error: "That logo format is not allowed." }, { status: 400 });
  }

  if (buffer.byteLength > MAX_LOGO_FILE_SIZE) {
    return NextResponse.json({ error: "Please keep the logo under 256KB." }, { status: 400 });
  }

  if (!isPrivateStorageConfigured()) {
    return NextResponse.json({ error: "Logo storage is temporarily unavailable." }, { status: 503 });
  }

  const sha256 = getDocumentSha256(buffer);
  const extension = getLogoExtension(detectedMimeType);
  const storageKey = `mover-logos/${mover.id}/${randomUUID()}.${extension}`;
  await putPrivateDocument({
    key: storageKey,
    body: buffer,
    contentType: detectedMimeType,
    fileName: `logo.${extension}`,
    sha256,
  });

  let updatedMover;
  try {
    updatedMover = await prisma.moverCompany.update({
      where: { id: mover.id },
      data: { logoUrl: toStoredMoverLogoUrl(storageKey) },
      include: {
        user: true,
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } catch (error) {
    await deletePrivateDocument(storageKey).catch(() => undefined);
    throw error;
  }

  const previousStorageKey = getStoredMoverLogoKey(mover.logoUrl);
  if (previousStorageKey) {
    await deletePrivateDocument(previousStorageKey).catch(() => undefined);
  }

  revalidatePublicMovers();
  revalidateAboutPage();

  return NextResponse.json({
    ok: true,
    logoUrl: `/api/public-movers/${updatedMover.id}/logo`,
    readiness: calculateMoverProfileReadiness(updatedMover),
  });
}
