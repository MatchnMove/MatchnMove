import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateMoverProfileReadiness, requireAuthenticatedMover } from "@/lib/mover-profile";
import { moverDocumentTypeSchema, moverDocumentUploadSchema, parseDataUrl, sanitiseFileName } from "@/lib/validators";

const ALLOWED_DOCUMENT_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024;

function serialiseDocument(document: {
  id: string;
  type: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: Date;
}) {
  return {
    id: document.id,
    type: document.type,
    fileName: document.fileName ?? "Document",
    mimeType: document.mimeType,
    fileSize: document.fileSize,
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

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(fileData.mimeType)) {
    return NextResponse.json({ error: "That document type is not allowed." }, { status: 400 });
  }

  if (fileData.fileSize > MAX_DOCUMENT_SIZE) {
    return NextResponse.json({ error: "Please keep documents under 4MB." }, { status: 400 });
  }

  const document = await prisma.moverDocument.create({
    data: {
      moverCompanyId: mover.id,
      type: parsed.data.type,
      fileName: sanitiseFileName(parsed.data.fileName),
      mimeType: fileData.mimeType,
      fileSize: fileData.fileSize,
      fileUrl: parsed.data.fileDataUrl,
    },
  });

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

  return NextResponse.json({
    document: serialiseDocument(document),
    readiness: calculateMoverProfileReadiness(refreshedMover),
  });
}
