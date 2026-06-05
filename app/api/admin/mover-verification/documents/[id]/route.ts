import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { calculateMoverProfileReadiness } from "@/lib/mover-profile";
import { DOCUMENT_VERIFICATION } from "@/lib/nzbn-verification";
import { revalidateAboutPage, revalidatePublicMovers } from "@/lib/public-cache";
import { adminDocumentReviewSchema } from "@/lib/validators";

async function readPayload(req: NextRequest) {
  if (req.headers.get("content-type")?.includes("form")) {
    const formData = await req.formData();
    return {
      status: formData.get("status"),
      note: formData.get("note"),
    };
  }

  return req.json().catch(() => null);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = adminDocumentReviewSchema.safeParse(await readPayload(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid review decision." }, { status: 400 });
  }

  const { id } = await params;
  const document = await prisma.moverDocument.findUnique({
    where: { id },
    select: { id: true, moverCompanyId: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const now = new Date();
  const reviewed = parsed.data.status !== DOCUMENT_VERIFICATION.PENDING_REVIEW;
  const updatedDocument = await prisma.moverDocument.update({
    where: { id: document.id },
    data: {
      verificationStatus: parsed.data.status,
      verificationNote: parsed.data.note,
      reviewedAt: reviewed ? now : null,
      reviewedBy: reviewed ? admin.reviewerId : null,
    },
  });

  const refreshedMover = await prisma.moverCompany.findUnique({
    where: { id: document.moverCompanyId },
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
    document: {
      id: updatedDocument.id,
      moverCompanyId: updatedDocument.moverCompanyId,
      type: updatedDocument.type,
      fileName: updatedDocument.fileName ?? "Document",
      mimeType: updatedDocument.mimeType,
      fileSize: updatedDocument.fileSize,
      verificationStatus: updatedDocument.verificationStatus,
      verificationNote: updatedDocument.verificationNote,
      reviewedAt: updatedDocument.reviewedAt?.toISOString() ?? null,
      reviewedBy: updatedDocument.reviewedBy,
      createdAt: updatedDocument.createdAt.toISOString(),
    },
    readiness: refreshedMover ? calculateMoverProfileReadiness(refreshedMover) : null,
  });
}
