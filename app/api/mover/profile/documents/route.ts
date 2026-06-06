import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { detectDocumentMimeType, getDocumentSha256, scanDocumentForMalware } from "@/lib/document-security";
import { sendVerificationReviewSubmitted } from "@/lib/email";
import { calculateMoverProfileReadiness, requireAuthenticatedMover } from "@/lib/mover-profile";
import { DOCUMENT_VERIFICATION } from "@/lib/nzbn-verification";
import { isPrivateStorageConfigured, putPrivateDocument } from "@/lib/private-storage";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";
import { moverDocumentTypeSchema, moverDocumentUploadSchema, parseDataUrl, sanitiseFileName } from "@/lib/validators";

const ALLOWED_DOCUMENT_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024;

function serialiseDocument(document: {
  id: string;
  type: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  verificationStatus: string;
  verificationNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  expiresAt: Date | null;
  scanStatus: string;
  detectedMimeType: string | null;
  createdAt: Date;
}) {
  return {
    id: document.id,
    type: document.type,
    fileName: document.fileName ?? "Document",
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    verificationStatus: document.verificationStatus,
    verificationNote: document.verificationNote,
    reviewedAt: document.reviewedAt?.toISOString() ?? null,
    reviewedBy: document.reviewedBy,
    expiresAt: document.expiresAt?.toISOString() ?? null,
    scanStatus: document.scanStatus,
    detectedMimeType: document.detectedMimeType,
    viewUrl: `/api/mover/profile/documents/${document.id}/file`,
    createdAt: document.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const typeParam = req.nextUrl.searchParams.get("type");
  const parsedType = typeParam ? moverDocumentTypeSchema.safeParse(typeParam) : null;
  if (typeParam && !parsedType?.success) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  }

  const documents = await prisma.moverDocument.findMany({
    where: {
      moverCompanyId: mover.id,
      ...(parsedType?.success ? { type: parsedType.data } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    documents: documents.map(serialiseDocument),
  });
}

export async function POST(req: NextRequest) {
  const mover = await requireAuthenticatedMover();
  if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = moverDocumentUploadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid document" }, { status: 400 });
  }

  const fileData = parseDataUrl(parsed.data.fileDataUrl);
  if (!fileData) {
    return NextResponse.json({ error: "Upload a PDF, PNG, JPG, or WEBP file." }, { status: 400 });
  }

  const buffer = Buffer.from(fileData.base64, "base64");
  const detectedMimeType = detectDocumentMimeType(buffer);

  if (!detectedMimeType || !ALLOWED_DOCUMENT_MIME_TYPES.has(detectedMimeType)) {
    return NextResponse.json({ error: "That document type is not allowed." }, { status: 400 });
  }

  if (detectedMimeType !== fileData.mimeType) {
    return NextResponse.json({ error: "The file contents do not match the selected file type." }, { status: 400 });
  }

  if (buffer.byteLength > MAX_DOCUMENT_SIZE) {
    return NextResponse.json({ error: "Please keep documents under 4MB." }, { status: 400 });
  }

  const fileName = sanitiseFileName(parsed.data.fileName);
  const sha256 = getDocumentSha256(buffer);
  const duplicate = await prisma.moverDocument.findFirst({
    where: { moverCompanyId: mover.id, sha256 },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "This exact document has already been uploaded." }, { status: 409 });
  }

  let scanResult: Awaited<ReturnType<typeof scanDocumentForMalware>>;
  try {
    scanResult = await scanDocumentForMalware(buffer, fileName, detectedMimeType);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The document could not be scanned safely." },
      { status: 400 },
    );
  }

  const storageConfigured = isPrivateStorageConfigured();
  if (!storageConfigured && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Private document storage is not configured. Contact Match 'n Move support." },
      { status: 503 },
    );
  }

  const storageKey = storageConfigured
    ? `mover-verification/${mover.id}/${randomUUID()}-${fileName}`
    : null;
  if (storageKey) {
    try {
      await putPrivateDocument({
        key: storageKey,
        body: buffer,
        contentType: detectedMimeType,
        fileName,
        sha256,
      });
    } catch {
      return NextResponse.json({ error: "The private document store is unavailable. Try again shortly." }, { status: 503 });
    }
  }

  const expiresAt = parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T23:59:59.999Z`) : null;
  const document = await prisma.moverDocument.create({
    data: {
      moverCompanyId: mover.id,
      type: parsed.data.type,
      fileName,
      mimeType: detectedMimeType,
      detectedMimeType,
      fileSize: buffer.byteLength,
      fileUrl: storageKey ? null : parsed.data.fileDataUrl,
      storageKey,
      sha256,
      scanStatus: scanResult.status,
      expiresAt,
      verificationStatus: DOCUMENT_VERIFICATION.PENDING_REVIEW,
      verificationNote: null,
      reviewedAt: null,
      reviewedBy: null,
    },
  });

  await prisma.verificationAudit.create({
    data: {
      moverCompanyId: mover.id,
      documentId: document.id,
      actorId: mover.userId,
      actorType: "MOVER",
      action: "DOCUMENT_SUBMITTED",
      nextStatus: DOCUMENT_VERIFICATION.PENDING_REVIEW,
      meta: {
        type: document.type,
        fileName,
        sha256,
        scanStatus: scanResult.status,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    },
  });

  await sendVerificationReviewSubmitted({
    moverCompanyName: mover.companyName,
    moverEmail: mover.user.email,
    item: `${document.type.replaceAll("_", " ")} document`,
    detail: `${fileName}${expiresAt ? `, expires ${expiresAt.toISOString().slice(0, 10)}` : ""}`,
  }).catch((error) => console.error("Could not queue verification review email", error));

  const refreshedMover = await prisma.moverCompany.findUnique({
    where: { id: mover.id },
    include: {
      user: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!refreshedMover) {
    return NextResponse.json({ error: "Mover profile not found." }, { status: 404 });
  }

  revalidatePublicMovers();
  revalidateAboutPage();

  return NextResponse.json({
    document: serialiseDocument(document),
    readiness: calculateMoverProfileReadiness(refreshedMover),
  });
}
