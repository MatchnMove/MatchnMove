import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { parseDataUrl } from "@/lib/validators";

const INLINE_PREVIEW_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

function buildContentDisposition(fileName: string, mimeType: string | null) {
  const safeFileName = fileName.replace(/[\r\n"]/g, "").trim() || "document";
  const dispositionType = mimeType && INLINE_PREVIEW_MIME_TYPES.has(mimeType) ? "inline" : "attachment";
  return `${dispositionType}; filename="${safeFileName}"`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const document = await prisma.moverDocument.findUnique({
    where: { id },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const data = parseDataUrl(document.fileUrl);
  if (!data) {
    return NextResponse.json({ error: "Stored document is invalid." }, { status: 500 });
  }

  const buffer = Buffer.from(data.base64, "base64");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": document.mimeType ?? data.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": buildContentDisposition(document.fileName ?? "document", document.mimeType ?? data.mimeType),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
